import type { DeckCardConfig } from '../types'
import { LOCAL_SCRYFALL_CACHE } from './scryfallCache'

function cacheKeyFor(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Attaches bundled Scryfall data (see scripts/fetch-card-assets.mjs) to preset-deck cards at
 * module load, so they render immediately with no network request — only cards missing from the
 * bundle (e.g. after a preset gains a new card before the next `fetch-cards` run) fall back to
 * the live Scryfall hydration path (AppContext / hydrateMissingScryfallData).
 */
export function attachLocalScryfallData(cards: DeckCardConfig[]): DeckCardConfig[] {
  return cards.map((card) => {
    const local = LOCAL_SCRYFALL_CACHE[cacheKeyFor(card.scryfallName)]
    return local ? { ...card, scryfall: local } : card
  })
}
