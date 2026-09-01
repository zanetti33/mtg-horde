import type { DeckConfig } from '../src/types'

/**
 * A minimal, fully offline deck: a single card, with its Scryfall data already filled in so
 * `hydrateMissingScryfallData` (see scryfall/hydrate.ts) has nothing to fetch — importing this
 * never hits the network, so tests using it are deterministic and fast in CI. Being the deck's only
 * card also means every draw is guaranteed to be it (see `buildStartingLibrary` in gameReducer.ts),
 * and `haste` means it can attack the very turn it's summoned — together that's what makes it
 * possible to reach the combat-outcome screen in a single, predictable bot turn.
 */
export const HASTE_CREATURE_DECK: DeckConfig = {
  cards: [
    {
      id: 'e2e-haste-creature',
      scryfallName: 'E2E Haste Creature',
      scryfall: { scryfallId: 'e2e-fixture-haste', name: 'E2E Haste Creature', manaCost: '', cmc: 0, typeLine: 'Creature', colors: [] },
      effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: ['haste'] },
      impact: 1,
      category: 'bigBad',
    },
  ],
}

export function deckFile(deck: DeckConfig) {
  return { name: 'deck.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(deck)) }
}
