import { describe, expect, it } from 'vitest'
import { computeBaseDrawCount, computeCardWeight, computeStartingBotLife, computeSuggestedPlayersLife, computeTargetLibrarySize } from './difficulty'

describe('computeCardWeight', () => {
  it('always weighs impact-1 cards at 1, regardless of turn or difficulty', () => {
    expect(computeCardWeight(1, 1, 4, 'easy')).toBe(1)
    expect(computeCardWeight(1, 20, 8, 'hard')).toBe(1)
  })

  it('heavily suppresses high-impact cards on early turns', () => {
    const earlyWeight = computeCardWeight(3, 1, 4, 'normal')
    expect(earlyWeight).toBeGreaterThan(0) // never a hard zero — still theoretically possible
    expect(earlyWeight).toBeLessThan(0.1) // but very unlikely relative to an impact-1 card
  })

  it('favors high-impact cards once the game runs long', () => {
    const lateWeight = computeCardWeight(3, 12, 4, 'normal')
    expect(lateWeight).toBeGreaterThan(1)
  })

  it('easy delays the high-impact ramp-up compared to hard, at the same turn/player count', () => {
    const easy = computeCardWeight(3, 3, 4, 'easy')
    const hard = computeCardWeight(3, 3, 4, 'hard')
    expect(easy).toBeLessThan(hard)
  })

  it('more players pulls the high-impact ramp-up earlier', () => {
    const fourPlayers = computeCardWeight(3, 3, 4, 'normal')
    const eightPlayers = computeCardWeight(3, 3, 8, 'normal')
    expect(eightPlayers).toBeGreaterThan(fourPlayers)
  })

  it('a bonus draw beyond the turn schedule suppresses weight, same as being earlier in the game', () => {
    const onSchedule = computeCardWeight(3, 6, 4, 'normal', 0)
    const withBonusDraw = computeCardWeight(3, 6, 4, 'normal', 1)
    expect(withBonusDraw).toBeLessThan(onSchedule)
  })
})

describe('computeBaseDrawCount', () => {
  it('never goes below 1, even on turn 1 with few players', () => {
    expect(computeBaseDrawCount(1, 1, 'easy')).toBeGreaterThanOrEqual(1)
  })

  it('grows with turn number', () => {
    const early = computeBaseDrawCount(2, 4, 'normal')
    const late = computeBaseDrawCount(10, 4, 'normal')
    expect(late).toBeGreaterThan(early)
  })

  it('grows with player count at a fixed turn', () => {
    const fourPlayers = computeBaseDrawCount(8, 4, 'normal')
    const eightPlayers = computeBaseDrawCount(8, 8, 'normal')
    expect(eightPlayers).toBeGreaterThan(fourPlayers)
  })

  it('hard ramps up hand size faster than easy at the same turn/player count', () => {
    const easy = computeBaseDrawCount(8, 4, 'easy')
    const hard = computeBaseDrawCount(8, 4, 'hard')
    expect(hard).toBeGreaterThan(easy)
  })

  it('matches the turn-4-vs-turn-5 example: drawing the same 3 cards is "on schedule" later, not earlier', () => {
    // At turn 4 the base schedule is below 3 (so hitting 3 needs a bonus draw); at turn 5 it's exactly 3.
    expect(computeBaseDrawCount(4, 4, 'normal')).toBeLessThan(3)
    expect(computeBaseDrawCount(5, 4, 'normal')).toBe(3)
  })
})

describe('computeStartingBotLife', () => {
  it('is 20 life per player', () => {
    expect(computeStartingBotLife(4)).toBe(80)
  })

  it('scales linearly with player count', () => {
    expect(computeStartingBotLife(8)).toBeGreaterThan(computeStartingBotLife(4))
    expect(computeStartingBotLife(2)).toBeLessThan(computeStartingBotLife(4))
  })
})

describe('computeSuggestedPlayersLife', () => {
  it('is 15 life per player', () => {
    expect(computeSuggestedPlayersLife(4)).toBe(60)
  })

  it('scales linearly with player count', () => {
    expect(computeSuggestedPlayersLife(8)).toBeGreaterThan(computeSuggestedPlayersLife(4))
  })
})

describe('computeTargetLibrarySize', () => {
  it('is 50 cards per player', () => {
    expect(computeTargetLibrarySize(4)).toBe(200)
  })

  it('scales linearly with player count', () => {
    expect(computeTargetLibrarySize(8)).toBe(400)
    expect(computeTargetLibrarySize(2)).toBe(100)
  })
})
