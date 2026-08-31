import { describe, expect, it } from 'vitest'
import type { BattlefieldCreature, BotState, DeckCardConfig } from '../types'
import { drawForTurn, getPendingQueries, recomputeStatus, resolveBotTurn } from './botTurnEngine'

const removalCard: DeckCardConfig = { id: 'r1', scryfallName: 'Doom Blade', effect: { kind: 'RemovalInstruction', mode: 'highestPower', count: 1, destroyOrExile: 'destroy' } }
const creatureCard: DeckCardConfig = { id: 'c1', scryfallName: 'Hill Giant', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } }
const hasteCreatureCard: DeckCardConfig = { id: 'c2', scryfallName: 'Charging Monstrosaur', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['haste'] } }
const gainLifeCard: DeckCardConfig = { id: 'g1', scryfallName: 'Rest for the Weary', effect: { kind: 'GainLifeBot', amount: 5 } }

const deckSnapshot = [creatureCard, removalCard, gainLifeCard, hasteCreatureCard]

const oldCreature: BattlefieldCreature = {
  instanceId: 'old1',
  name: 'Veteran',
  isToken: false,
  power: 1,
  toughness: 1,
  keywords: [],
  summoningSick: true, // should clear at the start of the bot's next turn
}

function makeBot(overrides: Partial<BotState> = {}): BotState {
  return {
    life: 20,
    library: [
      { instanceId: 'i-c1', deckCardId: 'c1' },
      { instanceId: 'i-r1', deckCardId: 'r1' },
      { instanceId: 'i-g1', deckCardId: 'g1' },
      { instanceId: 'i-c2', deckCardId: 'c2' },
    ],
    hand: [],
    battlefield: [oldCreature],
    graveyard: [],
    exile: [],
    ...overrides,
  }
}

describe('drawForTurn', () => {
  it('moves the top N cards from library to hand', () => {
    const bot = makeBot()
    const drafted = drawForTurn(bot, 3)
    expect(drafted.hand.map((c) => c.deckCardId)).toEqual(['c1', 'r1', 'g1'])
    expect(drafted.library.map((c) => c.deckCardId)).toEqual(['c2'])
  })
})

describe('getPendingQueries', () => {
  it('collects distinct queries from different cards without cross-card dedup', () => {
    const queryCardA: DeckCardConfig = { id: 'q1', scryfallName: 'A', effect: { kind: 'GainLifeBot', amount: { query: 'Quanti X?', multiplier: 1, offset: 0 } } }
    const queryCardB: DeckCardConfig = { id: 'q2', scryfallName: 'B', effect: { kind: 'GainLifeBot', amount: { query: 'Quanti X?', multiplier: 1, offset: 0 } } }
    const hand = [
      { instanceId: 'a', deckCardId: 'q1' },
      { instanceId: 'b', deckCardId: 'q2' },
    ]
    const prompts = getPendingQueries(hand, [queryCardA, queryCardB])
    expect(prompts).toHaveLength(2)
  })
})

describe('resolveBotTurn', () => {
  it('resolves table instructions before bot-state effects, clears old summoning sickness, and declares only non-sick attackers', () => {
    const drafted = drawForTurn(makeBot(), 3) // hand: c1 (creature), r1 (removal), g1 (gain life)
    const result = resolveBotTurn(drafted, deckSnapshot, {})

    // Removal (table instruction) is logged before the creature/life lines even though it was drawn second.
    const removalIndex = result.logLines.findIndex((l) => l.text.includes('Doom Blade'))
    const creatureIndex = result.logLines.findIndex((l) => l.text.includes('Hill Giant'))
    const lifeIndex = result.logLines.findIndex((l) => l.text.includes('Rest for the Weary'))
    expect(removalIndex).toBeGreaterThanOrEqual(0)
    expect(removalIndex).toBeLessThan(creatureIndex)
    expect(removalIndex).toBeLessThan(lifeIndex)

    expect(result.bot.life).toBe(25)
    expect(result.bot.battlefield).toHaveLength(2) // old creature + new Hill Giant
    expect(result.bot.graveyard.map((c) => c.deckCardId)).toEqual(expect.arrayContaining(['r1', 'g1']))

    // Only the old creature (sickness now cleared) can attack; the freshly cast Hill Giant cannot.
    expect(result.attackers).toHaveLength(1)
    expect(result.attackers[0].instanceId).toBe('old1')

    expect(result.bot.library.map((c) => c.deckCardId)).toEqual(['c2'])
    expect(result.status).toBe('ongoing')
  })

  it('carries DrawExtraBot cards over to next turn instead of resolving them immediately', () => {
    const drawExtraCard: DeckCardConfig = { id: 'd1', scryfallName: 'Divination', effect: { kind: 'DrawExtraBot', amount: 1 } }
    const bot = makeBot({ hand: [{ instanceId: 'i-d1', deckCardId: 'd1' }], battlefield: [] })
    const result = resolveBotTurn(bot, [...deckSnapshot, drawExtraCard], {})
    expect(result.bot.hand).toHaveLength(1) // the one card drawn by the effect
    expect(result.bot.library).toHaveLength(3) // 4 - 1 drawn by the effect
  })
})

describe('errata', () => {
  it('replaces the template-generated instruction text when set on the card', () => {
    const erratedCard: DeckCardConfig = {
      id: 'e1',
      scryfallName: 'Extinction Event',
      effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' },
      errata: 'Scegli chi colpire in base alla board.',
    }
    const bot = makeBot({ hand: [{ instanceId: 'i-e1', deckCardId: 'e1' }], battlefield: [] })
    const result = resolveBotTurn(bot, [erratedCard], {})

    const line = result.logLines.find((l) => l.text.includes('Extinction Event'))
    expect(line?.text).toBe('Il bot lancia Extinction Event: Scegli chi colpire in base alla board..')
    expect(line?.text).not.toContain('Distruggi tutte le creature')
  })
})

describe('recomputeStatus', () => {
  it('flags botDefeated at 0 life or empty library', () => {
    expect(recomputeStatus(makeBot({ life: 0 })).valueOf()).toBe('botDefeated')
    expect(recomputeStatus(makeBot({ library: [] })).valueOf()).toBe('botDefeated')
    expect(recomputeStatus(makeBot()).valueOf()).toBe('ongoing')
  })
})
