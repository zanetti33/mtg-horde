import { describe, expect, it, vi } from 'vitest'
import type { DeckCardConfig } from '../types'
import { attachLocalScryfallData } from './attachLocalScryfallData'

// vi.mock factories are hoisted above imports/other top-level code, so they can't close over
// ordinary top-level consts (see vitest's own error message for this) — vi.hoisted is the
// escape hatch: it hoists right alongside vi.mock, in the same order they're written.
const { CARD_ENTRY, TOKEN_ENTRY } = vi.hoisted(() => ({
  CARD_ENTRY: { scryfallId: 'card1', name: 'Colossal Dreadmaw', manaCost: '', cmc: 0, typeLine: 'Creature', colors: ['G'] },
  TOKEN_ENTRY: { scryfallId: 'tok1', name: 'Zombie', manaCost: '', cmc: 0, typeLine: 'Token Creature — Zombie', colors: ['B'] },
}))

vi.mock('./scryfallCache', () => ({
  LOCAL_SCRYFALL_CACHE: { 'colossal dreadmaw': CARD_ENTRY },
  LOCAL_TOKEN_SCRYFALL_CACHE: { 'token:zombie|2/2|': TOKEN_ENTRY },
  tokenCacheKeyFor: (tokenName: string, power: number, toughness: number, keywords: string[]) =>
    `token:${tokenName.trim().toLowerCase()}|${power}/${toughness}|${[...keywords].map((k) => k.toLowerCase()).sort().join(',')}`,
}))

describe('attachLocalScryfallData', () => {
  it('attaches the bundled scryfall data to a card whose name is in the local cache', () => {
    const card: DeckCardConfig = { id: 'c1', scryfallName: 'Colossal Dreadmaw', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } }
    const [result] = attachLocalScryfallData([card])
    expect(result.scryfall).toEqual(CARD_ENTRY)
  })

  it('leaves a card untouched when its name is not in the local cache', () => {
    const card: DeckCardConfig = { id: 'c2', scryfallName: 'Some Custom Card', effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } }
    const [result] = attachLocalScryfallData([card])
    expect(result.scryfall).toBeUndefined()
  })

  it('attaches a matching token Scryfall card to a CreateCreature effect that makes tokens', () => {
    const card: DeckCardConfig = {
      id: 'c3',
      scryfallName: 'Army of the Damned',
      effect: { kind: 'CreateCreature', count: 13, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
    }
    const [result] = attachLocalScryfallData([card])
    expect(result.effect.kind).toBe('CreateCreature')
    if (result.effect.kind === 'CreateCreature') expect(result.effect.tokenScryfall).toEqual(TOKEN_ENTRY)
  })

  it('does not attach token data to a count === 1 CreateCreature effect (no tokens produced)', () => {
    const card: DeckCardConfig = { id: 'c4', scryfallName: 'Whatever', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie' } }
    const [result] = attachLocalScryfallData([card])
    expect(result.effect.kind).toBe('CreateCreature')
    if (result.effect.kind === 'CreateCreature') expect(result.effect.tokenScryfall).toBeUndefined()
  })

  it('leaves tokenScryfall unset when no matching token identity is cached (e.g. different power/toughness)', () => {
    const card: DeckCardConfig = {
      id: 'c5',
      scryfallName: 'Whatever',
      effect: { kind: 'CreateCreature', count: 3, power: 9, toughness: 9, keywords: [], tokenName: 'Zombie' },
    }
    const [result] = attachLocalScryfallData([card])
    expect(result.effect.kind).toBe('CreateCreature')
    if (result.effect.kind === 'CreateCreature') expect(result.effect.tokenScryfall).toBeUndefined()
  })
})
