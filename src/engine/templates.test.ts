import { describe, expect, it } from 'vitest'
import type { BattlefieldCreature, BotPermanent, CreateCreatureEffect, CreatePermanentEffect, DeckCardConfig, GainLifeBotEffect, PumpBotBoardEffect } from '../types'
import { applyCreateCreature, applyCreatePermanent, applyGainLifeBot, applyPumpBotBoard, getEffectiveStats } from './templates'

function card(effect: DeckCardConfig['effect'], name = 'Test Card'): DeckCardConfig {
  return { id: 'card-1', scryfallName: name, effect }
}

describe('applyCreateCreature', () => {
  it('creates a single non-token creature carrying the card image and name', () => {
    const effect: CreateCreatureEffect = { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['flying'] }
    const c = { ...card(effect, 'Shivan Dragon'), scryfall: { scryfallId: 'x', name: 'Shivan Dragon', manaCost: '', cmc: 0, typeLine: '', colors: [], imageUrl: 'img.png' } }
    const result = applyCreateCreature(c, effect)
    expect(result.creatures).toHaveLength(1)
    expect(result.creatures[0].isToken).toBe(false)
    expect(result.creatures[0].name).toBe('Shivan Dragon')
    expect(result.creatures[0].imageUrl).toBe('img.png')
    expect(result.creatures[0].summoningSick).toBe(true)
  })

  it('creates multiple tokens without summoning sickness when haste is granted', () => {
    const effect: CreateCreatureEffect = { kind: 'CreateCreature', count: 3, power: 1, toughness: 1, keywords: ['haste'], tokenName: 'Goblin' }
    const result = applyCreateCreature(card(effect), effect)
    expect(result.creatures).toHaveLength(3)
    expect(result.creatures.every((c) => c.isToken)).toBe(true)
    expect(result.creatures.every((c) => c.summoningSick === false)).toBe(true)
    expect(result.creatures[0].name).toContain('Goblin')
  })
})

describe('applyPumpBotBoard', () => {
  it('buffs every creature on the battlefield and grants keywords without duplicating them', () => {
    const effect: PumpBotBoardEffect = { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] }
    const battlefield: BattlefieldCreature[] = [
      { instanceId: 'a', name: 'A', isToken: false, power: 2, toughness: 2, keywords: ['trample'], summoningSick: false },
      { instanceId: 'b', name: 'B', isToken: false, power: 1, toughness: 1, keywords: [], summoningSick: false },
    ]
    const result = applyPumpBotBoard(effect, battlefield)
    expect(result.battlefield[0]).toMatchObject({ power: 5, toughness: 5, keywords: ['trample'] })
    expect(result.battlefield[1]).toMatchObject({ power: 4, toughness: 4, keywords: ['trample'] })
  })
})

describe('applyCreatePermanent', () => {
  it('builds a BotPermanent carrying the card image/name, distinct from a creature', () => {
    const effect: CreatePermanentEffect = { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] }
    const c = { ...card(effect, 'Glorious Anthem'), scryfall: { scryfallId: 'x', name: 'Glorious Anthem', manaCost: '', cmc: 0, typeLine: 'Enchantment', colors: ['W'], imageUrl: 'img.png' } }
    const result = applyCreatePermanent(c, effect)
    expect(result.permanent).toMatchObject({ name: 'Glorious Anthem', imageUrl: 'img.png', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1 })
    expect(result.description).toContain('+1/+1')
  })
})

describe('getEffectiveStats', () => {
  it('returns base stats unchanged when there are no active permanents', () => {
    const creature: BattlefieldCreature = { instanceId: 'a', name: 'A', isToken: false, power: 2, toughness: 2, keywords: ['trample'], summoningSick: false }
    expect(getEffectiveStats(creature, [])).toEqual({ power: 2, toughness: 2, keywords: ['trample'] })
  })

  it('sums every active permanent bonus and merges granted keywords without duplicates', () => {
    const creature: BattlefieldCreature = { instanceId: 'a', name: 'A', isToken: false, power: 2, toughness: 2, keywords: ['trample'], summoningSick: false }
    const permanents: BotPermanent[] = [
      { instanceId: 'p1', name: 'Anthem', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['trample'], sourceDeckCardId: 'p1' },
      { instanceId: 'p2', name: 'Double Strike Enchant', permanentType: 'enchantment', powerBonus: 0, toughnessBonus: 0, grantKeywords: ['doublestrike'], sourceDeckCardId: 'p2' },
    ]
    const result = getEffectiveStats(creature, permanents)
    expect(result.power).toBe(3)
    expect(result.toughness).toBe(3)
    expect(result.keywords.sort()).toEqual(['doublestrike', 'trample'])
  })
})

describe('applyGainLifeBot', () => {
  it('resolves the life amount', () => {
    const effect: GainLifeBotEffect = { kind: 'GainLifeBot', amount: 8 }
    expect(applyGainLifeBot(effect).amount).toBe(8)
  })
})
