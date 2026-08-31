import type { ScryfallCardData } from '../types'

const CACHE_KEY = 'horde-scryfall-cache-v1'
const API_BASE = 'https://api.scryfall.com'

// Scryfall asks integrators to keep requests to roughly 5-10/second and to
// cache aggressively. We do both: a serialized delay between calls (a real
// queue, not just a timestamp check — concurrent callers, e.g. React
// StrictMode's double-invoked effects, would otherwise race past a naive
// "time since last call" check and burst well above the limit) and a
// permanent localStorage cache of resolved cards.
const REQUEST_DELAY_MS = 150
let lastRequestAt = 0
let requestQueue: Promise<void> = Promise.resolve()

async function throttledFetch(url: string): Promise<Response> {
  const mySlot = requestQueue.then(async () => {
    const wait = Math.max(0, lastRequestAt + REQUEST_DELAY_MS - Date.now())
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    lastRequestAt = Date.now()
  })
  // Keep the queue alive even if this slot's fetch fails downstream.
  requestQueue = mySlot.catch(() => {})
  await mySlot
  return fetch(url)
}

function loadCache(): Record<string, ScryfallCardData> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveCache(cache: Record<string, ScryfallCardData>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full or unavailable — cache is best-effort, not required for correctness.
  }
}

function cacheKeyFor(name: string): string {
  return name.trim().toLowerCase()
}

interface ScryfallImageUris {
  normal?: string
  small?: string
}

interface ScryfallCardResponse {
  id: string
  name: string
  mana_cost?: string
  cmc: number
  type_line: string
  colors?: string[]
  image_uris?: ScryfallImageUris
  card_faces?: Array<{ image_uris?: ScryfallImageUris }>
}

function mapCard(raw: ScryfallCardResponse): ScryfallCardData {
  const imageUrl = raw.image_uris?.normal ?? raw.card_faces?.[0]?.image_uris?.normal
  return {
    scryfallId: raw.id,
    name: raw.name,
    manaCost: raw.mana_cost ?? '',
    cmc: raw.cmc,
    typeLine: raw.type_line,
    imageUrl,
    colors: raw.colors ?? [],
  }
}

/** Autocomplete card names for the deck builder's search box. */
export async function autocompleteCardNames(query: string): Promise<string[]> {
  if (query.trim().length < 2) return []
  try {
    const res = await throttledFetch(`${API_BASE}/cards/autocomplete?q=${encodeURIComponent(query)}`)
    if (!res.ok) return []
    const data = (await res.json()) as { data: string[] }
    return data.data
  } catch {
    // Network error (offline, CORS, rate limit) — degrade to no suggestions rather than throwing.
    return []
  }
}

// Number of attempts before giving up on a single card. Scryfall lookups routinely hit transient
// failures unrelated to the card itself — a 429 from bursty callers (React StrictMode, a freshly
// loaded 49-card preset), a dropped connection, a CORS preflight that flakes — and none of those
// are worth surfacing as "this card doesn't exist." A short retry absorbs them; a genuine 404
// (card really doesn't exist under that name) is returned immediately instead, since retrying
// wouldn't change that.
const MAX_FETCH_ATTEMPTS = 3
const RETRY_DELAY_MS = 500

/** Resolve a card by (fuzzy) name, using and populating the localStorage cache. */
export async function getCardByName(name: string): Promise<ScryfallCardData | null> {
  const cache = loadCache()
  const key = cacheKeyFor(name)
  if (cache[key]) return cache[key]

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await throttledFetch(`${API_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`)
      if (res.ok) {
        const raw = (await res.json()) as ScryfallCardResponse
        const card = mapCard(raw)
        cache[key] = card
        saveCache(cache)
        return card
      }
      if (res.status === 404) return null // genuinely no match — retrying won't help
      // Other non-ok statuses (429 rate limit, 5xx) are treated as transient below.
    } catch {
      // Network error (offline, CORS, dropped connection) — treated as transient below.
    }
    if (attempt < MAX_FETCH_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt))
  }
  return null
}
