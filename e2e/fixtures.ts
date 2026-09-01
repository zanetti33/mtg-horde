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

/**
 * A single card that makes 3 identical tokens in one resolution (`CreateCreature.count: 3`) — all
 * created together, so they share the same `summoningSick` state and are guaranteed to land in one
 * `groupCreatures` stack (see engine/battlefieldGrouping.ts) as soon as the card resolves.
 */
export const THREE_TOKEN_DECK: DeckConfig = {
  cards: [
    {
      id: 'e2e-three-tokens',
      scryfallName: 'E2E Token Maker',
      scryfall: { scryfallId: 'e2e-fixture-tokens', name: 'E2E Token Maker', manaCost: '', cmc: 0, typeLine: 'Sorcery', colors: [] },
      effect: { kind: 'CreateCreature', count: 3, power: 1, toughness: 1, keywords: [], tokenName: 'E2E Token', tokenTypeLine: 'Illusion', tokenColors: [] },
      impact: 1,
      category: 'horde',
    },
  ],
}

/** Same idea as THREE_TOKEN_DECK, but with haste — all 3 can attack the turn they're summoned, so this reliably reaches the combat-outcome screen as one 3-wide stack. */
export const THREE_HASTE_TOKEN_DECK: DeckConfig = {
  cards: [
    {
      id: 'e2e-three-haste-tokens',
      scryfallName: 'E2E Haste Token Maker',
      scryfall: { scryfallId: 'e2e-fixture-haste-tokens', name: 'E2E Haste Token Maker', manaCost: '', cmc: 0, typeLine: 'Sorcery', colors: [] },
      effect: { kind: 'CreateCreature', count: 3, power: 1, toughness: 1, keywords: ['haste'], tokenName: 'E2E Haste Token' },
      impact: 1,
      category: 'horde',
    },
  ],
}

export function deckFile(deck: DeckConfig) {
  return { name: 'deck.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(deck)) }
}
