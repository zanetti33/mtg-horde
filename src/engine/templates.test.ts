import { describe, expect, it } from 'vitest'
import type { BattlefieldCreature, CreateCreatureEffect, DeckCardConfig, GainLifeBotEffect, PumpBotBoardEffect } from '../types'
import { applyCreateCreature, applyGainLifeBot, applyPumpBotBoard, collectQueriesForCard, resolveNumeric } from './templates'

function card(effect: DeckCardConfig['effect'], name = 'Test Card'): DeckCardConfig {
  return { id: 'card-1', scryfallName: name, effect }
}

describe('resolveNumeric', () => {
  it('returns a fixed number unchanged', () => {
    const c = card({ kind: 'GainLifeBot', amount: 7 } satisfies GainLifeBotEffect)
    expect(resolveNumeric(c, 'amount', {})).toBe(7)
  })

  it('applies multiplier and offset from a query answer', () => {
    const c = card({ kind: 'GainLifeBot', amount: { query: 'quanti?', multiplier: 2, offset: 1 } } satisfies GainLifeBotEffect)
    const answers = { [`card-1:quanti?`]: 5 }
    expect(resolveNumeric(c, 'amount', answers)).toBe(11) // 5*2+1
  })

  it('clamps to min and max', () => {
    const c = card({ kind: 'GainLifeBot', amount: { query: 'q', multiplier: 1, offset: 0, min: 5, max: 10 } } satisfies GainLifeBotEffect)
    expect(resolveNumeric(c, 'amount', { 'card-1:q': 2 })).toBe(5)
    expect(resolveNumeric(c, 'amount', { 'card-1:q': 99 })).toBe(10)
    expect(resolveNumeric(c, 'amount', { 'card-1:q': 7 })).toBe(7)
  })

  it('treats a missing query answer as 0', () => {
    const c = card({ kind: 'GainLifeBot', amount: { query: 'q', multiplier: 3, offset: 2 } } satisfies GainLifeBotEffect)
    expect(resolveNumeric(c, 'amount', {})).toBe(2)
  })
})

describe('collectQueriesForCard', () => {
  it('dedupes fields on the same card that ask the identical question', () => {
    const effect: CreateCreatureEffect = {
      kind: 'CreateCreature',
      count: 1,
      power: { query: 'Quanti artefatti?', multiplier: 1, offset: 4 },
      toughness: { query: 'Quanti artefatti?', multiplier: 1, offset: 4 },
      keywords: [],
    }
    const prompts = collectQueriesForCard(card(effect, 'Bane of Progress'))
    expect(prompts).toHaveLength(1)
    expect(prompts[0].prompt).toBe('Quanti artefatti?')
    expect(prompts[0].cardName).toBe('Bane of Progress')
  })

  it('returns nothing for a card with only fixed values', () => {
    const effect: CreateCreatureEffect = { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] }
    expect(collectQueriesForCard(card(effect))).toHaveLength(0)
  })
})

describe('applyCreateCreature', () => {
  it('creates a single non-token creature carrying the card image and name', () => {
    const effect: CreateCreatureEffect = { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['flying'] }
    const c = { ...card(effect, 'Shivan Dragon'), scryfall: { scryfallId: 'x', name: 'Shivan Dragon', manaCost: '', cmc: 0, typeLine: '', colors: [], imageUrl: 'img.png' } }
    const result = applyCreateCreature(c, effect, {})
    expect(result.creatures).toHaveLength(1)
    expect(result.creatures[0].isToken).toBe(false)
    expect(result.creatures[0].name).toBe('Shivan Dragon')
    expect(result.creatures[0].imageUrl).toBe('img.png')
    expect(result.creatures[0].summoningSick).toBe(true)
  })

  it('creates multiple tokens without summoning sickness when haste is granted', () => {
    const effect: CreateCreatureEffect = { kind: 'CreateCreature', count: 3, power: 1, toughness: 1, keywords: ['haste'], tokenName: 'Goblin' }
    const result = applyCreateCreature(card(effect), effect, {})
    expect(result.creatures).toHaveLength(3)
    expect(result.creatures.every((c) => c.isToken)).toBe(true)
    expect(result.creatures.every((c) => c.summoningSick === false)).toBe(true)
    expect(result.creatures[0].name).toContain('Goblin')
  })

  it('resolves query-scaled power/toughness sharing one answer (Bane of Progress style)', () => {
    const effect: CreateCreatureEffect = {
      kind: 'CreateCreature',
      count: 1,
      power: { query: 'Quanti?', multiplier: 1, offset: 4, min: 4 },
      toughness: { query: 'Quanti?', multiplier: 1, offset: 4, min: 4 },
      keywords: [],
    }
    const c = card(effect, 'Bane of Progress')
    const result = applyCreateCreature(c, effect, { 'card-1:Quanti?': 3 })
    expect(result.creatures[0].power).toBe(7)
    expect(result.creatures[0].toughness).toBe(7)
  })
})

describe('applyPumpBotBoard', () => {
  it('buffs every creature on the battlefield and grants keywords without duplicating them', () => {
    const effect: PumpBotBoardEffect = { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] }
    const c = card(effect)
    const battlefield: BattlefieldCreature[] = [
      { instanceId: 'a', name: 'A', isToken: false, power: 2, toughness: 2, keywords: ['trample'], summoningSick: false },
      { instanceId: 'b', name: 'B', isToken: false, power: 1, toughness: 1, keywords: [], summoningSick: false },
    ]
    const result = applyPumpBotBoard(c, effect, {}, battlefield)
    expect(result.battlefield[0]).toMatchObject({ power: 5, toughness: 5, keywords: ['trample'] })
    expect(result.battlefield[1]).toMatchObject({ power: 4, toughness: 4, keywords: ['trample'] })
  })
})

describe('applyGainLifeBot', () => {
  it('resolves the life amount', () => {
    const effect: GainLifeBotEffect = { kind: 'GainLifeBot', amount: 8 }
    expect(applyGainLifeBot(card(effect), effect, {}).amount).toBe(8)
  })
})
