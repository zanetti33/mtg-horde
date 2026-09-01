#!/usr/bin/env node
// Fetches Scryfall data + "normal" images for every card name referenced by the
// prebuilt decks (src/data/*Deck.ts), AND for every distinct *token* they produce
// (CreateCreature effects with count > 1 — see the `tokenName`/`power`/`toughness`/
// `keywords` on those), then bundles all of it into the repo:
//   - public/cards/<scryfallId>.jpg      (the image files, served as static assets)
//   - src/data/scryfallCache.store.json  (persistent store: queried key -> card data,
//                                          source of truth across runs)
//   - src/data/scryfallCache.ts          (generated from the store: LOCAL_SCRYFALL_CACHE for
//                                          regular cards, LOCAL_TOKEN_SCRYFALL_CACHE for tokens,
//                                          image paths resolved via import.meta.env.BASE_URL)
//
// Why: the app previously hit the live Scryfall API/CDN for these cards on every
// fresh session (localStorage cache is per-browser-profile, not shared), which
// tripped Scryfall's rate limit for the fixed, known set of cards in the preset
// decks. Bundling them removes that traffic entirely — custom cards added via
// the deck builder still resolve against the live API (see src/scryfall/api.ts),
// since those can't be known ahead of time.
//
// Tokens are resolved against Scryfall's *token* cards (layout:token), not the spell
// that creates them — e.g. for a card that makes "2/2 black Zombie" tokens, this
// fetches the real printed "Zombie" token, matched by name + power/toughness +
// keywords (a deck can produce more than one distinct token under the same name —
// e.g. a flying vs. a non-flying "Zombie" — so all four are part of the identity).
//
// Re-run this whenever a preset deck gains a new card name or token spec —
// already-stored entries are skipped (not re-fetched), so this is safe and cheap
// to re-run:
//   node scripts/fetch-card-assets.mjs
// Pass --force to re-fetch everything (e.g. to pick up updated card images).

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DECK_FILES = ['src/data/zombieDeck.ts', 'src/data/dinosaurDeck.ts']
const IMAGES_DIR = path.join(ROOT, 'public', 'cards')
const STORE_FILE = path.join(ROOT, 'src', 'data', 'scryfallCache.store.json')
const OUTPUT_FILE = path.join(ROOT, 'src', 'data', 'scryfallCache.ts')
const API_BASE = 'https://api.scryfall.com'
const REQUEST_DELAY_MS = 200
const FORCE = process.argv.includes('--force')
// Every token cache key is prefixed with this, so it can never collide with a regular card's
// plain-lowercased-name key in the same flat store — see tokenCacheKeyFor.
const TOKEN_KEY_PREFIX = 'token:'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function extractCardNames() {
  const names = new Set()
  const nameRe = /scryfallName:\s*(['"])((?:\\.|(?!\1).)*)\1/g
  for (const file of DECK_FILES) {
    const text = await readFile(path.join(ROOT, file), 'utf8')
    for (const match of text.matchAll(nameRe)) {
      names.add(match[2].replace(/\\(['"])/g, '$1'))
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

// Must match the (much simpler, runtime-only) copy embedded in the generated output file, which
// is what attachLocalScryfallData.ts actually imports — this one only exists so the fetch step can
// compute the same keys ahead of time.
function tokenCacheKeyFor(tokenName, power, toughness, keywords) {
  return `${TOKEN_KEY_PREFIX}${tokenName.trim().toLowerCase()}|${power}/${toughness}|${[...keywords].map((k) => k.toLowerCase()).sort().join(',')}`
}

/** Every distinct token identity (name + power/toughness + keywords) produced by a count > 1 CreateCreature effect across both preset decks. No nested `{` ever appears inside one of these effect object literals, so a non-greedy "up to the next }" match is safe. */
async function extractTokenSpecs() {
  const specs = new Map()
  const effectRe = /\{\s*kind:\s*'CreateCreature'[^}]*\}/g
  for (const file of DECK_FILES) {
    const text = await readFile(path.join(ROOT, file), 'utf8')
    for (const match of text.matchAll(effectRe)) {
      const block = match[0]
      const countMatch = block.match(/count:\s*(-?\d+)/)
      const tokenNameMatch = block.match(/tokenName:\s*'((?:\\.|[^'])*)'/)
      if (!countMatch || !tokenNameMatch || Number(countMatch[1]) <= 1) continue

      const powerMatch = block.match(/power:\s*(-?\d+)/)
      const toughnessMatch = block.match(/toughness:\s*(-?\d+)/)
      const keywordsMatch = block.match(/keywords:\s*\[([^\]]*)\]/)
      const tokenName = tokenNameMatch[1].replace(/\\(['"])/g, '$1')
      const power = Number(powerMatch[1])
      const toughness = Number(toughnessMatch[1])
      const keywords = (keywordsMatch?.[1] ?? '')
        .split(',')
        .map((s) => s.trim().replace(/^'|'$/g, ''))
        .filter(Boolean)

      const key = tokenCacheKeyFor(tokenName, power, toughness, keywords)
      if (!specs.has(key)) specs.set(key, { key, tokenName, power, toughness, keywords })
    }
  }
  return [...specs.values()].sort((a, b) => a.key.localeCompare(b.key))
}

async function loadStore() {
  try {
    return JSON.parse(await readFile(STORE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

async function saveStore(store) {
  const sorted = Object.fromEntries(Object.keys(store).sort().map((key) => [key, store[key]]))
  await writeFile(STORE_FILE, JSON.stringify(sorted, null, 2) + '\n', 'utf8')
}

// Scryfall rejects requests carrying a default HTTP-library User-Agent (a
// generic_user_agent 400) — it requires one identifying the calling app.
const REQUEST_HEADERS = { 'User-Agent': 'HordeBot/1.0 (github.com/horde-bot; local dev/build tool)', Accept: '*/*' }
const MAX_ATTEMPTS = 4

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, { headers: REQUEST_HEADERS })
    if (res.ok) return res
    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get('retry-after')) || 2 * attempt
      console.error(`    rate limited, waiting ${retryAfter}s before retry ${attempt + 1}/${MAX_ATTEMPTS}...`)
      await sleep(retryAfter * 1000)
      continue
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`)
  }
  throw new Error(`gave up after ${MAX_ATTEMPTS} attempts: ${url}`)
}

async function fetchCard(name) {
  const res = await fetchWithRetry(`${API_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`)
  return res.json()
}

const KEYWORD_SCRYFALL_NAME = {
  flying: 'Flying',
  trample: 'Trample',
  deathtouch: 'Deathtouch',
  lifelink: 'Lifelink',
  firststrike: 'First strike',
  doublestrike: 'Double strike',
  menace: 'Menace',
  vigilance: 'Vigilance',
  reach: 'Reach',
  haste: 'Haste',
}

/** Searches Scryfall's real *token* cards (not the spell that makes them) for one matching name + power/toughness, preferring a result whose own keyword list matches `spec.keywords` exactly when more than one token shares that name/stat-line (e.g. a plain vs. a Decayed "Zombie"). */
async function fetchToken(spec) {
  const parts = [`!"${spec.tokenName}"`, 'layout:token', `pow=${spec.power}`, `tou=${spec.toughness}`]
  for (const kw of spec.keywords) {
    const name = KEYWORD_SCRYFALL_NAME[kw] ?? kw
    parts.push(`keyword:${name.includes(' ') ? `"${name}"` : name}`)
  }
  const query = parts.join(' ')
  const res = await fetchWithRetry(`${API_BASE}/cards/search?q=${encodeURIComponent(query)}`)
  const data = await res.json()
  if (data.object === 'error' || !data.data?.length) {
    throw new Error(`no token match for "${spec.tokenName}" ${spec.power}/${spec.toughness} [${spec.keywords.join(',')}] (query: ${query})`)
  }

  const wanted = spec.keywords.map((k) => (KEYWORD_SCRYFALL_NAME[k] ?? k).toLowerCase()).sort()
  const exact = data.data.find((c) => {
    const actual = (c.keywords ?? []).map((k) => k.toLowerCase()).sort()
    return actual.length === wanted.length && actual.every((k, i) => k === wanted[i])
  })
  return exact ?? data.data[0]
}

async function downloadImage(url, destPath) {
  const res = await fetchWithRetry(url)
  const bytes = Buffer.from(await res.arrayBuffer())
  await writeFile(destPath, bytes)
}

function cacheKeyFor(name) {
  return name.trim().toLowerCase()
}

/** Downloads `raw`'s image (if any) and writes its resolved entry into `store[key]`. Shared by both the named-card path and the token-search path — they converge to the same Scryfall card shape. */
async function storeCard(store, key, raw) {
  const imageUris = raw.image_uris ?? raw.card_faces?.[0]?.image_uris
  let imagePath
  if (imageUris?.normal) {
    const ext = path.extname(new URL(imageUris.normal).pathname) || '.jpg'
    const fileName = `${raw.id}${ext}`
    await downloadImage(imageUris.normal, path.join(IMAGES_DIR, fileName))
    await sleep(REQUEST_DELAY_MS)
    imagePath = `cards/${fileName}`
  }
  store[key] = {
    scryfallId: raw.id,
    name: raw.name,
    manaCost: raw.mana_cost ?? '',
    cmc: raw.cmc,
    typeLine: raw.type_line,
    imagePath,
    colors: raw.colors ?? [],
  }
}

async function main() {
  await mkdir(IMAGES_DIR, { recursive: true })

  const names = await extractCardNames()
  const tokenSpecs = await extractTokenSpecs()
  console.log(`Found ${names.length} unique card names and ${tokenSpecs.length} unique token identities across preset decks.`)

  const store = FORCE ? {} : await loadStore()
  const namesToFetch = names.filter((name) => !(cacheKeyFor(name) in store))
  const tokensToFetch = tokenSpecs.filter((spec) => !(spec.key in store))
  console.log(
    `${names.length - namesToFetch.length} cards already cached, ${namesToFetch.length} to fetch. ` +
      `${tokenSpecs.length - tokensToFetch.length} tokens already cached, ${tokensToFetch.length} to fetch.`,
  )

  let fetched = 0
  let failed = 0

  for (const name of namesToFetch) {
    try {
      const raw = await fetchCard(name)
      await sleep(REQUEST_DELAY_MS)
      // Keyed by the *queried* name, not raw.name — Scryfall's fuzzy match can resolve to a
      // differently-cased or pluralized canonical name (e.g. "Ranging Raptor" -> "Ranging
      // Raptors"), and lookups happen by the name string as written in the deck files.
      await storeCard(store, cacheKeyFor(name), raw)
      fetched += 1
      console.log(`  ok: ${name} -> ${raw.name}`)
      // Persist after every success so a later failure (or a rate-limit abort) never loses
      // progress already made — this ran into exactly that bug during development.
      await saveStore(store)
    } catch (err) {
      failed += 1
      console.error(`  FAILED: ${name}: ${err.message}`)
    }
  }

  for (const spec of tokensToFetch) {
    try {
      const raw = await fetchToken(spec)
      await sleep(REQUEST_DELAY_MS)
      await storeCard(store, spec.key, raw)
      fetched += 1
      console.log(`  ok token: ${spec.tokenName} ${spec.power}/${spec.toughness} [${spec.keywords.join(',') || 'no keywords'}] -> ${raw.set}/${raw.id}`)
      await saveStore(store)
    } catch (err) {
      failed += 1
      console.error(`  FAILED token: ${spec.tokenName} ${spec.power}/${spec.toughness}: ${err.message}`)
    }
  }

  const totalCached = names.length - namesToFetch.length + (tokenSpecs.length - tokensToFetch.length)
  console.log(`\nDone: ${fetched} fetched, ${totalCached} already cached, ${failed} failed.`)
  if (failed > 0) console.error('Some entries failed — re-run the script to retry just those (already-stored ones are skipped).')

  const cardEntries = Object.keys(store).filter((k) => !k.startsWith(TOKEN_KEY_PREFIX))
  const tokenEntries = Object.keys(store).filter((k) => k.startsWith(TOKEN_KEY_PREFIX))
  const toBody = (keys) =>
    keys
      .sort()
      .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(store[key])},`)
      .join('\n')

  const output = `// AUTO-GENERATED by scripts/fetch-card-assets.mjs — do not edit by hand.
// Source of truth: src/data/scryfallCache.store.json. Regenerate with:
//   node scripts/fetch-card-assets.mjs
//
// Card data and images © Wizards of the Coast, provided by Scryfall
// (https://scryfall.com) under their data usage guidelines. See
// src/scryfall/CREDITS.md for the required attribution.

import type { Keyword, ScryfallCardData } from '../types'

interface CachedEntry {
  scryfallId: string
  name: string
  manaCost: string
  cmc: number
  typeLine: string
  imagePath?: string
  colors: string[]
}

const RAW: Record<string, CachedEntry> = {
${toBody(cardEntries)}
}

const RAW_TOKENS: Record<string, CachedEntry> = {
${toBody(tokenEntries)}
}

function resolve(entry: CachedEntry): ScryfallCardData {
  return {
    scryfallId: entry.scryfallId,
    name: entry.name,
    manaCost: entry.manaCost,
    cmc: entry.cmc,
    typeLine: entry.typeLine,
    imageUrl: entry.imagePath ? \`\${import.meta.env.BASE_URL}\${entry.imagePath}\` : undefined,
    colors: entry.colors,
  }
}

/** Preset-deck cards resolved ahead of time (scripts/fetch-card-assets.mjs), keyed by lowercased trimmed card name. */
export const LOCAL_SCRYFALL_CACHE: Record<string, ScryfallCardData> = Object.fromEntries(
  Object.entries(RAW).map(([key, entry]) => [key, resolve(entry)]),
)

/**
 * The real Scryfall *token* card for each distinct token identity a preset-deck card produces
 * (CreateCreature.count > 1 — name + power/toughness + keywords), resolved ahead of time the same
 * way as LOCAL_SCRYFALL_CACHE. Key format defined by tokenCacheKeyFor below — must stay in sync
 * with the (separately maintained, Node-side) copy in scripts/fetch-card-assets.mjs.
 */
export const LOCAL_TOKEN_SCRYFALL_CACHE: Record<string, ScryfallCardData> = Object.fromEntries(
  Object.entries(RAW_TOKENS).map(([key, entry]) => [key, resolve(entry)]),
)

/** Builds a LOCAL_TOKEN_SCRYFALL_CACHE key from a CreateCreature effect's token identity. */
export function tokenCacheKeyFor(tokenName: string, power: number, toughness: number, keywords: Keyword[]): string {
  return \`token:\${tokenName.trim().toLowerCase()}|\${power}/\${toughness}|\${[...keywords].map((k) => k.toLowerCase()).sort().join(',')}\`
}
`

  await writeFile(OUTPUT_FILE, output, 'utf8')
  console.log(`Wrote ${OUTPUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
