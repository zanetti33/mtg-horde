#!/usr/bin/env node
// Fetches Scryfall data + "normal" images for every card name referenced by the
// prebuilt decks (src/data/*Deck.ts) and bundles them into the repo:
//   - public/cards/<scryfallId>.jpg      (the image files, served as static assets)
//   - src/data/scryfallCache.store.json  (persistent store: queried name -> card data,
//                                          source of truth across runs)
//   - src/data/scryfallCache.ts          (generated from the store: name -> ScryfallCardData,
//                                          image path resolved via import.meta.env.BASE_URL)
//
// Why: the app previously hit the live Scryfall API/CDN for these cards on every
// fresh session (localStorage cache is per-browser-profile, not shared), which
// tripped Scryfall's rate limit for the fixed, known set of cards in the preset
// decks. Bundling them removes that traffic entirely — custom cards added via
// the deck builder still resolve against the live API (see src/scryfall/api.ts),
// since those can't be known ahead of time.
//
// Re-run this whenever a preset deck gains a new card name — already-stored
// names are skipped (not re-fetched), so this is safe and cheap to re-run:
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

async function downloadImage(url, destPath) {
  const res = await fetchWithRetry(url)
  const bytes = Buffer.from(await res.arrayBuffer())
  await writeFile(destPath, bytes)
}

function cacheKeyFor(name) {
  return name.trim().toLowerCase()
}

async function main() {
  await mkdir(IMAGES_DIR, { recursive: true })

  const names = await extractCardNames()
  console.log(`Found ${names.length} unique card names across preset decks.`)

  const store = FORCE ? {} : await loadStore()
  const toFetch = names.filter((name) => !(cacheKeyFor(name) in store))
  console.log(`${names.length - toFetch.length} already cached, ${toFetch.length} to fetch.`)

  let fetched = 0
  let failed = 0

  for (const name of toFetch) {
    try {
      const raw = await fetchCard(name)
      await sleep(REQUEST_DELAY_MS)

      const imageUris = raw.image_uris ?? raw.card_faces?.[0]?.image_uris
      let imagePath
      if (imageUris?.normal) {
        const ext = path.extname(new URL(imageUris.normal).pathname) || '.jpg'
        const fileName = `${raw.id}${ext}`
        await downloadImage(imageUris.normal, path.join(IMAGES_DIR, fileName))
        await sleep(REQUEST_DELAY_MS)
        imagePath = `cards/${fileName}`
      }

      // Keyed by the *queried* name, not raw.name — Scryfall's fuzzy match can resolve to a
      // differently-cased or pluralized canonical name (e.g. "Ranging Raptor" -> "Ranging
      // Raptors"), and lookups happen by the name string as written in the deck files.
      store[cacheKeyFor(name)] = {
        scryfallId: raw.id,
        name: raw.name,
        manaCost: raw.mana_cost ?? '',
        cmc: raw.cmc,
        typeLine: raw.type_line,
        imagePath,
        colors: raw.colors ?? [],
      }
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

  console.log(`\nDone: ${fetched} fetched, ${names.length - toFetch.length} already cached, ${failed} failed.`)
  if (failed > 0) console.error('Some cards failed — re-run the script to retry just those (already-stored ones are skipped).')

  const body = Object.keys(store)
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

import type { ScryfallCardData } from '../types'

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
${body}
}

/** Preset-deck cards resolved ahead of time (scripts/fetch-card-assets.mjs), keyed by lowercased trimmed card name. */
export const LOCAL_SCRYFALL_CACHE: Record<string, ScryfallCardData> = Object.fromEntries(
  Object.entries(RAW).map(([key, entry]) => [
    key,
    {
      scryfallId: entry.scryfallId,
      name: entry.name,
      manaCost: entry.manaCost,
      cmc: entry.cmc,
      typeLine: entry.typeLine,
      imageUrl: entry.imagePath ? \`\${import.meta.env.BASE_URL}\${entry.imagePath}\` : undefined,
      colors: entry.colors,
    },
  ]),
)
`

  await writeFile(OUTPUT_FILE, output, 'utf8')
  console.log(`Wrote ${OUTPUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
