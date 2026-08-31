import { describe, expect, it } from 'vitest'
import type { BattlefieldCreature, BotState, DeckCardConfig } from '../types'
import {
  clearSummoningSickness,
  counterSingleCard,
  declareAttackers,
  drawForTurn,
  drawNextTurnHand,
  getPendingQueries,
  orderHandForResolution,
  recomputeStatus,
  resolveSingleCard,
} from './botTurnEngine'

const removalCard: DeckCardConfig = { id: 'r1', scryfallName: 'Doom Blade', effect: { kind: 'RemovalInstruction', mode: 'highestPower', count: 1, destroyOrExile: 'destroy' } }
const creatureCard: DeckCardConfig = { id: 'c1', scryfallName: 'Hill Giant', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } }
const hasteCreatureCard: DeckCardConfig = { id: 'c2', scryfallName: 'Charging Monstrosaur', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['haste'] } }
const gainLifeCard: DeckCardConfig = { id: 'g1', scryfallName: 'Rest for the Weary', effect: { kind: 'GainLifeBot', amount: 5 } }

const deckSnapshot = [creatureCard, removalCard, gainLifeCard, hasteCreatureCard]

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
    battlefield: [],
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
    const queryCardA: DeckCardConfig = { id: 'q1', scryfallName: 'A', effect: { kind: 'GainLifeBot', amount: { query: 'How many X?', multiplier: 1, offset: 0 } } }
    const queryCardB: DeckCardConfig = { id: 'q2', scryfallName: 'B', effect: { kind: 'GainLifeBot', amount: { query: 'How many X?', multiplier: 1, offset: 0 } } }
    const hand = [
      { instanceId: 'a', deckCardId: 'q1' },
      { instanceId: 'b', deckCardId: 'q2' },
    ]
    const prompts = getPendingQueries(hand, [queryCardA, queryCardB])
    expect(prompts).toHaveLength(2)
  })
})

describe('orderHandForResolution', () => {
  it('puts table instructions before bot-state effects, preserving order within each group', () => {
    const hand = [
      { instanceId: 'a', deckCardId: 'c1' }, // creature (bot-state)
      { instanceId: 'b', deckCardId: 'g1' }, // gain life (bot-state)
      { instanceId: 'c', deckCardId: 'r1' }, // removal (table instruction)
    ]
    const ordered = orderHandForResolution(hand, deckSnapshot)
    expect(ordered.map((r) => r.instanceId)).toEqual(['c', 'a', 'b'])
  })
})

describe('clearSummoningSickness', () => {
  it('clears sickness on every battlefield creature', () => {
    const sick: BattlefieldCreature = { instanceId: 'b1', name: 'Veteran', isToken: false, power: 1, toughness: 1, keywords: [], summoningSick: true }
    expect(clearSummoningSickness([sick])[0].summoningSick).toBe(false)
  })
})

describe('resolveSingleCard', () => {
  it('applies a CreateCreature effect to the battlefield without touching hand/library', () => {
    const bot = makeBot()
    const ref = { instanceId: 'i-c1', deckCardId: 'c1' }
    const result = resolveSingleCard(bot, ref, creatureCard, {})
    expect(result.bot.battlefield).toHaveLength(1)
    expect(result.bot.battlefield[0]).toMatchObject({ name: 'Hill Giant', power: 3, toughness: 3 })
    expect(result.bot.graveyard).toEqual([]) // creatures stay on the battlefield, not the graveyard
    expect(result.logLine.text).toContain('Hill Giant')
    expect(result.extraDraws).toBe(0)
  })

  it('sends a resolved non-creature card to the graveyard', () => {
    const bot = makeBot()
    const ref = { instanceId: 'i-g1', deckCardId: 'g1' }
    const result = resolveSingleCard(bot, ref, gainLifeCard, {})
    expect(result.bot.life).toBe(25)
    expect(result.bot.graveyard).toEqual([ref])
  })

  it('reports extraDraws for a resolved DrawExtraBot card without drawing immediately', () => {
    const drawExtraCard: DeckCardConfig = { id: 'd1', scryfallName: 'Divination', effect: { kind: 'DrawExtraBot', amount: 2 } }
    const bot = makeBot()
    const ref = { instanceId: 'i-d1', deckCardId: 'd1' }
    const result = resolveSingleCard(bot, ref, drawExtraCard, {})
    expect(result.extraDraws).toBe(2)
    expect(result.bot.library).toBe(bot.library) // untouched — caller draws later, at end of turn
    expect(result.bot.graveyard).toEqual([ref])
  })

  it('an errata on the card replaces the template-generated instruction text', () => {
    const erratedCard: DeckCardConfig = {
      id: 'e1',
      scryfallName: 'Extinction Event',
      effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' },
      errata: 'Choose who to hit based on the board.',
    }
    const bot = makeBot()
    const ref = { instanceId: 'i-e1', deckCardId: 'e1' }
    const result = resolveSingleCard(bot, ref, erratedCard, {})
    expect(result.logLine.text).toBe('The bot casts Extinction Event: Choose who to hit based on the board..')
    expect(result.logLine.text).not.toContain('Destroy all creatures')
  })
})

describe('counterSingleCard', () => {
  it('sends the card to the graveyard without applying any effect', () => {
    const bot = makeBot()
    const ref = { instanceId: 'i-c1', deckCardId: 'c1' }
    const result = counterSingleCard(bot, ref, creatureCard)
    expect(result.bot.battlefield).toEqual([]) // never entered play
    expect(result.bot.graveyard).toEqual([ref])
    expect(result.logLine.text).toContain('countered')
    expect(result.extraDraws).toBe(0)
  })
})

describe('declareAttackers', () => {
  it('only non-sick creatures attack', () => {
    const ready: BattlefieldCreature = { instanceId: 'r', name: 'Ready', isToken: false, power: 2, toughness: 2, keywords: [], summoningSick: false }
    const sick: BattlefieldCreature = { instanceId: 's', name: 'Sick', isToken: false, power: 4, toughness: 4, keywords: [], summoningSick: true }
    const result = declareAttackers([ready, sick])
    expect(result.attackers.map((c) => c.instanceId)).toEqual(['r'])
    expect(result.logLine.text).toContain('Ready')
  })

  it('reports no attackers when nothing is ready', () => {
    const result = declareAttackers([])
    expect(result.attackers).toEqual([])
    expect(result.logLine.text).toBe('The bot has no creatures ready to attack this turn.')
  })
})

describe('drawNextTurnHand', () => {
  it('draws drawPerTurn cards and logs the count', () => {
    const library = [
      { instanceId: 'i-c1', deckCardId: 'c1' },
      { instanceId: 'i-r1', deckCardId: 'r1' },
      { instanceId: 'i-g1', deckCardId: 'g1' },
      { instanceId: 'i-c2', deckCardId: 'c2' },
    ]
    const result = drawNextTurnHand(library, 3, 0)
    expect(result.hand.map((c) => c.deckCardId)).toEqual(['c1', 'r1', 'g1'])
    expect(result.library.map((c) => c.deckCardId)).toEqual(['c2'])
    expect(result.logLine?.text).toContain('draws 3 cards for the next turn')
  })

  it('adds extraDraws on top of drawPerTurn and mentions the breakdown', () => {
    const library = [
      { instanceId: 'i-c1', deckCardId: 'c1' },
      { instanceId: 'i-r1', deckCardId: 'r1' },
      { instanceId: 'i-g1', deckCardId: 'g1' },
    ]
    const result = drawNextTurnHand(library, 1, 2)
    expect(result.hand).toHaveLength(3)
    expect(result.logLine?.text).toContain('1 normal + 2 extra')
  })

  it('returns no log line and an empty hand when the library is already empty', () => {
    const result = drawNextTurnHand([], 3, 0)
    expect(result.hand).toEqual([])
    expect(result.logLine).toBeNull()
  })
})

describe('recomputeStatus', () => {
  it('flags botDefeated at 0 life or empty library', () => {
    expect(recomputeStatus(makeBot({ life: 0 })).valueOf()).toBe('botDefeated')
    expect(recomputeStatus(makeBot({ library: [] })).valueOf()).toBe('botDefeated')
    expect(recomputeStatus(makeBot()).valueOf()).toBe('ongoing')
  })
})
