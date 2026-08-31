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

/** Resolve a card by (fuzzy) name, using and populating the localStorage cache. */
export async function getCardByName(name: string): Promise<ScryfallCardData | null> {
  const cache = loadCache()
  const key = cacheKeyFor(name)
  if (cache[key]) return cache[key]

  try {
    const res = await throttledFetch(`${API_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`)
    if (!res.ok) return null
    const raw = (await res.json()) as ScryfallCardResponse
    const card = mapCard(raw)

    cache[key] = card
    saveCache(cache)
    return card
  } catch {
    // Network error (offline, CORS, rate limit) — caller treats a null same as "not found yet".
    return null
  }
}
