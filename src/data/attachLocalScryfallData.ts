import type { DeckCardConfig } from '../types'
import { LOCAL_SCRYFALL_CACHE, LOCAL_TOKEN_SCRYFALL_CACHE, tokenCacheKeyFor } from './scryfallCache'

function cacheKeyFor(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Attaches bundled Scryfall data (see scripts/fetch-card-assets.mjs) to preset-deck cards at
 * module load, so they render immediately with no network request — only cards missing from the
 * bundle (e.g. after a preset gains a new card before the next `fetch-cards` run) fall back to
 * the live Scryfall hydration path (AppContext / hydrateMissingScryfallData).
 *
 * `CreateCreature` cards that make tokens (count > 1) also get a matching real Scryfall *token*
 * card attached to `effect.tokenScryfall`, the same way — see that field in types.ts.
 */
export function attachLocalScryfallData(cards: DeckCardConfig[]): DeckCardConfig[] {
  return cards.map((card) => {
    const local = LOCAL_SCRYFALL_CACHE[cacheKeyFor(card.scryfallName)]
    const withScryfall = local ? { ...card, scryfall: local } : card

    const effect = withScryfall.effect
    if (effect.kind === 'CreateCreature' && effect.count > 1 && effect.tokenName) {
      const tokenLocal = LOCAL_TOKEN_SCRYFALL_CACHE[tokenCacheKeyFor(effect.tokenName, effect.power, effect.toughness, effect.keywords)]
      if (tokenLocal) return { ...withScryfall, effect: { ...effect, tokenScryfall: tokenLocal } }
    }

    return withScryfall
  })
}
