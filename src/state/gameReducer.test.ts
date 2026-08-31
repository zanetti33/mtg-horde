import { describe, expect, it } from 'vitest'
import { appReducer, type AppState } from './gameReducer'
import type { BattlefieldCreature, DeckCardConfig, GameState } from '../types'

const creatureCard: DeckCardConfig = { id: 'c1', scryfallName: 'Hill Giant', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } }
const hasteCreatureCard: DeckCardConfig = { id: 'c2', scryfallName: 'Raider', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['haste'] } }
const removalCard: DeckCardConfig = { id: 'r1', scryfallName: 'Doom Blade', effect: { kind: 'RemovalInstruction', mode: 'highestPower', count: 1, destroyOrExile: 'destroy' } }

const deckSnapshot = [creatureCard, hasteCreatureCard, removalCard]

function makeState(game: Partial<GameState['bot']>): AppState {
  const bot: GameState['bot'] = {
    life: 20,
    library: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    ...game,
  }
  return {
    deck: deckSnapshot,
    deckSource: 'Custom',
    game: {
      config: { playerCount: 4, difficulty: 'normal' },
      deckSnapshot,
      bot,
      playersLife: 20,
      turnLog: [],
      turnNumber: 1,
      phase: 'idle',
      status: 'ongoing',
      pendingAttackers: null,
      pendingTurn: null,
    },
  }
}

describe('MOVE_CARD', () => {
  it('moves a card ref from hand to graveyard', () => {
    const state = makeState({ hand: [{ instanceId: 'i1', deckCardId: 'r1' }] })
    const result = appReducer(state, { type: 'MOVE_CARD', instanceId: 'i1', origin: 'hand', destination: { zone: 'graveyard' } })
    expect(result.game?.bot.hand).toHaveLength(0)
    expect(result.game?.bot.graveyard).toEqual([{ instanceId: 'i1', deckCardId: 'r1' }])
  })

  it('inserts into the library at the requested position', () => {
    const state = makeState({
      graveyard: [{ instanceId: 'g1', deckCardId: 'r1' }],
      library: [{ instanceId: 'lib1', deckCardId: 'r1' }],
    })
    const result = appReducer(state, {
      type: 'MOVE_CARD',
      instanceId: 'g1',
      origin: 'graveyard',
      destination: { zone: 'library', position: { kind: 'top' } },
    })
    expect(result.game?.bot.library.map((r) => r.instanceId)).toEqual(['g1', 'lib1'])
  })

  it('a token vanishes when it leaves the battlefield regardless of destination', () => {
    const token: BattlefieldCreature = { instanceId: 't1', name: 'Zombie token', isToken: true, power: 2, toughness: 2, keywords: [], summoningSick: false, sourceDeckCardId: 'c1' }
    const state = makeState({ battlefield: [token] })
    const result = appReducer(state, { type: 'MOVE_CARD', instanceId: 't1', origin: 'battlefield', destination: { zone: 'hand' } })
    expect(result.game?.bot.battlefield).toHaveLength(0)
    expect(result.game?.bot.hand).toHaveLength(0)
    expect(result.game?.bot.graveyard).toHaveLength(0)
  })

  it('a non-token creature leaving the battlefield becomes a CardRef in the destination zone', () => {
    const creature: BattlefieldCreature = { instanceId: 'b1', name: 'Hill Giant', isToken: false, power: 3, toughness: 3, keywords: [], summoningSick: false, sourceDeckCardId: 'c1' }
    const state = makeState({ battlefield: [creature] })
    const result = appReducer(state, { type: 'MOVE_CARD', instanceId: 'b1', origin: 'battlefield', destination: { zone: 'exile' } })
    expect(result.game?.bot.battlefield).toHaveLength(0)
    expect(result.game?.bot.exile).toEqual([{ instanceId: 'b1', deckCardId: 'c1' }])
  })

  it('rebuilds a battlefield creature (with haste reflected in summoning sickness) when a CreateCreature card returns to play from the graveyard', () => {
    const state = makeState({ graveyard: [{ instanceId: 'g1', deckCardId: 'c2' }] })
    const result = appReducer(state, { type: 'MOVE_CARD', instanceId: 'g1', origin: 'graveyard', destination: { zone: 'battlefield' } })
    expect(result.game?.bot.graveyard).toHaveLength(0)
    expect(result.game?.bot.battlefield).toEqual([
      { instanceId: 'g1', name: 'Raider', imageUrl: undefined, isToken: false, power: 2, toughness: 2, keywords: ['haste'], summoningSick: false, sourceDeckCardId: 'c2' },
    ])
  })

  it('leaves the card untouched when asked to put a non-creature card onto the battlefield', () => {
    const state = makeState({ hand: [{ instanceId: 'h1', deckCardId: 'r1' }] })
    const result = appReducer(state, { type: 'MOVE_CARD', instanceId: 'h1', origin: 'hand', destination: { zone: 'battlefield' } })
    expect(result.game?.bot.hand).toEqual([{ instanceId: 'h1', deckCardId: 'r1' }])
    expect(result.game?.bot.battlefield).toHaveLength(0)
  })

  it('is a no-op when the instance is not actually in the stated origin zone', () => {
    const state = makeState({ hand: [{ instanceId: 'h1', deckCardId: 'r1' }] })
    const result = appReducer(state, { type: 'MOVE_CARD', instanceId: 'does-not-exist', origin: 'graveyard', destination: { zone: 'hand' } })
    expect(result.game?.bot).toEqual(state.game?.bot)
  })
})

describe('BEGIN_BOT_TURN / RESOLVE_TURN_CARD (card-by-card reveal)', () => {
  it('reveals and resolves the hand one card at a time, table instructions first, finalizing only once the queue is empty', () => {
    const state = makeState({
      hand: [
        { instanceId: 'h-creature', deckCardId: 'c1' },
        { instanceId: 'h-removal', deckCardId: 'r1' },
      ],
      library: [{ instanceId: 'lib1', deckCardId: 'c2' }],
    })

    const begun = appReducer(state, { type: 'BEGIN_BOT_TURN', queryAnswers: {} })
    expect(begun.game?.phase).toBe('resolvingTurn')
    expect(begun.game?.turnLog).toEqual([])
    // Reordered: the removal (table instruction) comes first even though it was drawn second.
    expect(begun.game?.bot.hand.map((r) => r.instanceId)).toEqual(['h-removal', 'h-creature'])

    const afterFirst = appReducer(begun, { type: 'RESOLVE_TURN_CARD', countered: false })
    expect(afterFirst.game?.phase).toBe('resolvingTurn') // one card still queued
    expect(afterFirst.game?.turnLog).toHaveLength(1)
    expect(afterFirst.game?.turnLog[0].text).toContain('Doom Blade')
    expect(afterFirst.game?.bot.battlefield).toHaveLength(0) // the creature hasn't resolved yet

    const afterSecond = appReducer(afterFirst, { type: 'RESOLVE_TURN_CARD', countered: false })
    expect(afterSecond.game?.bot.battlefield).toHaveLength(1) // now the creature is in play
    expect(afterSecond.game?.pendingTurn).toBeNull()
    // Queue empty -> turn finalized: attackers declared (freshly cast, so none) and next hand drawn.
    expect(afterSecond.game?.phase).toBe('idle')
    expect(afterSecond.game?.turnNumber).toBe(state.game!.turnNumber + 1)
    expect(afterSecond.game?.bot.hand).toEqual([{ instanceId: 'lib1', deckCardId: 'c2' }])
  })

  it('countering a card sends it to the graveyard without applying its effect', () => {
    const state = makeState({ hand: [{ instanceId: 'h1', deckCardId: 'c1' }] })
    const begun = appReducer(state, { type: 'BEGIN_BOT_TURN', queryAnswers: {} })
    const result = appReducer(begun, { type: 'RESOLVE_TURN_CARD', countered: true })

    expect(result.game?.bot.battlefield).toHaveLength(0) // countered — never entered play
    expect(result.game?.bot.graveyard).toEqual([{ instanceId: 'h1', deckCardId: 'c1' }])
    expect(result.game?.turnLog[0].text).toContain('countered')
  })

  it('skips straight to finalizing when the hand is empty, still clearing summoning sickness and declaring attackers', () => {
    const sickCreature: BattlefieldCreature = { instanceId: 'b1', name: 'Veteran', isToken: false, power: 1, toughness: 1, keywords: [], summoningSick: true, sourceDeckCardId: 'c1' }
    const state = makeState({ hand: [], battlefield: [sickCreature], library: [{ instanceId: 'lib1', deckCardId: 'c2' }] })

    const result = appReducer(state, { type: 'BEGIN_BOT_TURN', queryAnswers: {} })
    expect(result.game?.phase).toBe('awaitingAttackOutcome')
    expect(result.game?.pendingAttackers).toHaveLength(1)
    expect(result.game?.bot.hand).toEqual([{ instanceId: 'lib1', deckCardId: 'c2' }])
  })
})

describe('START_GAME', () => {
  it('inflates a small curated deck up to 50 cards per player (mill protection)', () => {
    const state: AppState = { deck: deckSnapshot, deckSource: 'Custom', game: null }
    const result = appReducer(state, { type: 'START_GAME', config: { playerCount: 4, difficulty: 'normal' } })
    const totalCards = (result.game?.bot.library.length ?? 0) + (result.game?.bot.hand.length ?? 0)
    expect(totalCards).toBe(200)
  })

  it('scales the library size with player count', () => {
    const state: AppState = { deck: deckSnapshot, deckSource: 'Custom', game: null }
    const result = appReducer(state, { type: 'START_GAME', config: { playerCount: 8, difficulty: 'normal' } })
    const totalCards = (result.game?.bot.library.length ?? 0) + (result.game?.bot.hand.length ?? 0)
    expect(totalCards).toBe(400)
  })

  it('trims a curated deck bigger than the target down to it', () => {
    const bigDeck: DeckCardConfig[] = Array.from({ length: 300 }, (_, i) => ({ ...creatureCard, id: `big-${i}` }))
    const state: AppState = { deck: bigDeck, deckSource: 'Custom', game: null }
    const result = appReducer(state, { type: 'START_GAME', config: { playerCount: 4, difficulty: 'normal' } })
    const totalCards = (result.game?.bot.library.length ?? 0) + (result.game?.bot.hand.length ?? 0)
    expect(totalCards).toBe(200)
  })
})
