import type { Difficulty } from '../types'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
}

/**
 * Turn at which high-impact cards stop being suppressed and start being
 * favored, for a 4-player game — see `computeCardWeight`.
 */
const BASE_UNLOCK_TURN: Record<Difficulty, number> = { easy: 8, normal: 6, hard: 4 }

const PLAYER_COUNT_BASELINE = 4
/** More players than the baseline pulls the unlock turn earlier (bot needs to scale up faster against more combined resources); fewer players pushes it later. */
const UNLOCK_SHIFT_PER_PLAYER = 0.5
/** How sharply weight moves away from neutral (1.0) per turn of distance from the unlock turn. */
const STEEPNESS = 0.75

function unlockTurn(difficulty: Difficulty, playerCount: number): number {
  return BASE_UNLOCK_TURN[difficulty] - UNLOCK_SHIFT_PER_PLAYER * (playerCount - PLAYER_COUNT_BASELINE)
}

/**
 * Turns it takes to go from drawing 1 card to drawing `playerCount` extra cards — lower means the
 * bot's hand size ramps up faster. This is the "how many cards" dial; `computeCardWeight` below is
 * the "how strong are they" dial. Both are driven by the same (turn, playerCount, difficulty)
 * inputs, deliberately kept as two separate levers rather than one derived from the other.
 */
const DRAW_COUNT_RAMP_TURNS: Record<Difficulty, number> = { easy: 10, normal: 8, hard: 6 }

/**
 * Deterministic base hand size for `turnNumber`, before any `DrawExtraBot` bonus draws — replaces
 * a flat manually-configured draw count so quantity scales the same way quality does.
 */
export function computeBaseDrawCount(turnNumber: number, playerCount: number, difficulty: Difficulty): number {
  const raw = (turnNumber / DRAW_COUNT_RAMP_TURNS[difficulty]) * playerCount
  return Math.max(1, Math.round(raw))
}

/**
 * Each bonus card drawn beyond a turn's base schedule (`computeBaseDrawCount`) — e.g. from a
 * resolved `DrawExtraBot` card — nudges card-weighting as if the bot were this many turns earlier.
 * This is what keeps the two dials from compounding: a turn that draws more cards than its schedule
 * calls for gets comparatively weaker cards in exchange, instead of also getting a quality bump.
 */
const DRAW_COUNT_WEIGHT_COUPLING = 1

/**
 * Relative weight for drawing a card of the given `impact` (1 = low, 2 = medium, 3 = high, though
 * any positive scalar works) on `turnNumber`, for `playerCount` players at `difficulty`.
 * `bonusDrawCount` is how many cards this specific draw is pulling beyond the turn's base schedule
 * (see `computeBaseDrawCount`) — 0 for a hand drawn exactly on schedule.
 *
 * Impact-1 cards always weigh 1 regardless of turn/difficulty/bonus draws (1 raised to any power is
 * 1) — they're the "always available" baseline. Higher-impact cards start heavily suppressed (turns
 * before the unlock turn) and become increasingly favored past it, so the bot's threats escalate
 * over the game instead of being uniformly likely from turn one. This is deliberately
 * probabilistic, not a hard gate: an early bomb stays possible, just very unlikely.
 */
export function computeCardWeight(impact: number, turnNumber: number, playerCount: number, difficulty: Difficulty, bonusDrawCount = 0): number {
  const exponent = STEEPNESS * (turnNumber - unlockTurn(difficulty, playerCount)) - DRAW_COUNT_WEIGHT_COUPLING * bonusDrawCount
  return Math.max(impact, 1) ** exponent
}

/**
 * Life the bot's horde deck starts with. Scales with `playerCount` alone (not turn or difficulty):
 * a bigger table throws more attackers and removal at the bot per turn regardless of how the cards
 * it draws are weighted, so without this the offense scaling above would be wasted — the bot would
 * just die before the late-game threats it's tuned to draw ever come up. Difficulty and turn number
 * already have their own dedicated levers (card weight, draw count); doubling them up on life too
 * would make the difficulty knob affect three things at once instead of one.
 */
const BOT_LIFE_PER_PLAYER = 20

export function computeStartingBotLife(playerCount: number): number {
  return BOT_LIFE_PER_PLAYER * playerCount
}

/**
 * Suggested starting value for the players' shared life counter — purely a default to pre-fill the
 * setup form with something sane for the chosen table size. Unlike bot life, this number is never
 * read by the engine (see `GameState.playersLife`): the table tracks and adjusts it by hand for the
 * whole game, so it stays a freely editable field rather than a derived, locked-in value.
 */
const SUGGESTED_PLAYERS_LIFE_PER_PLAYER = 15

export function computeSuggestedPlayersLife(playerCount: number): number {
  return SUGGESTED_PLAYERS_LIFE_PER_PLAYER * playerCount
}

/**
 * Starting library size for `playerCount` players — always exactly `50 * playerCount`, regardless of
 * how many cards were curated into the deck (see `buildStartingLibrary` in state/gameReducer.ts,
 * which pads or trims the curated deck to fit). Without this, mill (deck-out) strategies get
 * disproportionately stronger at bigger tables — more players means more chances someone brings a
 * mill plan, and more combined mill output per turn, against a library that didn't get any bigger.
 */
const LIBRARY_SIZE_PER_PLAYER = 50

export function computeTargetLibrarySize(playerCount: number): number {
  return LIBRARY_SIZE_PER_PLAYER * playerCount
}
