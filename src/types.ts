// Domain types for the Horde Bot companion app.
// See plan: the app tracks ONLY the bot's own state (life, library, hand,
// battlefield, graveyard). Effects that would act on the players are
// rendered as generic text instructions the table resolves itself.

export type Keyword =
  | 'flying'
  | 'trample'
  | 'deathtouch'
  | 'lifelink'
  | 'firststrike'
  | 'doublestrike'
  | 'menace'
  | 'vigilance'
  | 'reach'
  | 'haste'

export const ALL_KEYWORDS: Keyword[] = [
  'flying',
  'trample',
  'deathtouch',
  'lifelink',
  'firststrike',
  'doublestrike',
  'menace',
  'vigilance',
  'reach',
  'haste',
]

export const KEYWORD_LABELS: Record<Keyword, string> = {
  flying: 'Flying',
  trample: 'Trample',
  deathtouch: 'Deathtouch',
  lifelink: 'Lifelink',
  firststrike: 'First strike',
  doublestrike: 'Double strike',
  menace: 'Menace',
  vigilance: 'Vigilance',
  reach: 'Reach',
  haste: 'Haste',
}

/** Cached subset of Scryfall's card object — only what the UI/engine needs. */
export interface ScryfallCardData {
  scryfallId: string
  name: string
  manaCost: string
  cmc: number
  typeLine: string
  imageUrl?: string
  colors: string[]
}

/**
 * A numeric parameter that is either a fixed value, or derived from a single
 * operator-provided number at resolution time (Archenemy-style scaling),
 * e.g. "1 per artifact the players control, minimum 5" ->
 * { query: '...', multiplier: 1, offset: 0, min: 5 }.
 *
 * Kept as data (not a function) so DeckCardConfig stays JSON-serializable
 * for localStorage.
 */
export type NumericValue = number | QueryValue

export interface QueryValue {
  query: string
  multiplier: number
  offset: number
  min?: number
  max?: number
}

export function isQueryValue(value: NumericValue): value is QueryValue {
  return typeof value === 'object' && value !== null
}

// --- Effect templates -------------------------------------------------

/** Modifies bot-tracked state directly. */
export interface CreateCreatureEffect {
  kind: 'CreateCreature'
  count: NumericValue
  power: NumericValue
  toughness: NumericValue
  keywords: Keyword[]
  /** Display name for produced tokens when count resolves > 1. Defaults to the card's own name. */
  tokenName?: string
}

export interface PumpBotBoardEffect {
  kind: 'PumpBotBoard'
  powerBonus: NumericValue
  toughnessBonus: NumericValue
  grantKeywords: Keyword[]
}

export interface GainLifeBotEffect {
  kind: 'GainLifeBot'
  amount: NumericValue
}

export interface DrawExtraBotEffect {
  kind: 'DrawExtraBot'
  amount: NumericValue
}

/** Generates only a text instruction for the table to resolve themselves — no tracked state is touched. */
export type RemovalMode = 'highestPower' | 'highestToughness' | 'highestManaValue' | 'random' | 'all'

export interface RemovalInstructionEffect {
  kind: 'RemovalInstruction'
  mode: RemovalMode
  count: NumericValue
  destroyOrExile: 'destroy' | 'exile'
}

export type DamageTarget = 'eachPlayer' | 'creatureHighestPower' | 'creatureHighestToughness' | 'creatureRandom' | 'allCreatures'

export interface DamageInstructionEffect {
  kind: 'DamageInstruction'
  amount: NumericValue
  target: DamageTarget
}

export interface SacrificeInstructionEffect {
  kind: 'SacrificeInstruction'
  perPlayer: boolean
  count: NumericValue
}

export interface DiscardInstructionEffect {
  kind: 'DiscardInstruction'
  perPlayer: boolean
  count: NumericValue
}

export type BotStateEffect = CreateCreatureEffect | PumpBotBoardEffect | GainLifeBotEffect | DrawExtraBotEffect
export type TableInstructionEffect =
  | RemovalInstructionEffect
  | DamageInstructionEffect
  | SacrificeInstructionEffect
  | DiscardInstructionEffect

export type EffectParams = BotStateEffect | TableInstructionEffect
export type EffectTemplateId = EffectParams['kind']

export function isBotStateEffect(effect: EffectParams): effect is BotStateEffect {
  return effect.kind === 'CreateCreature' || effect.kind === 'PumpBotBoard' || effect.kind === 'GainLifeBot' || effect.kind === 'DrawExtraBot'
}

// --- Deck configuration -------------------------------------------------

export interface DeckCardConfig {
  /** Unique id for this deck entry (not the Scryfall id — allows duplicate copies of a card). */
  id: string
  scryfallName: string
  scryfall?: ScryfallCardData
  effect: EffectParams
  /**
   * Optional custom-rule text ("errata") that REPLACES the auto-generated
   * instruction for this card. For real cards whose resolution depends on
   * board state the app deliberately doesn't track (e.g. a modal choice
   * between two mana-value-filtered sweeps), the closest single template
   * mode can't express the correct rule on its own — this field lets the
   * deck author spell out, in plain text, how the table should resolve it
   * instead. Used sparingly: most cards should map cleanly onto a template
   * per the usual deck-curation criteria (see docs/game-design.md).
   */
  errata?: string
}

export interface DeckConfig {
  cards: DeckCardConfig[]
}

// --- Game state -----------------------------------------------------------

/** Reference to a card sitting in library/hand/graveyard, resolved against GameState.deckSnapshot. */
export interface CardRef {
  instanceId: string
  deckCardId: string
}

export interface BattlefieldCreature {
  instanceId: string
  name: string
  imageUrl?: string
  isToken: boolean
  power: number
  toughness: number
  keywords: Keyword[]
  summoningSick: boolean
  sourceDeckCardId?: string
}

export interface BotState {
  life: number
  library: CardRef[]
  hand: CardRef[]
  battlefield: BattlefieldCreature[]
  graveyard: CardRef[]
  exile: CardRef[]
}

/** Where in the library a card goes — `nth` is 1-indexed from the top (1 = top). */
export type LibraryPosition = { kind: 'top' } | { kind: 'bottom' } | { kind: 'nth'; n: number }

/** One of the bot's own tracked zones. */
export type Zone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile'

/**
 * Where a bot card can be sent, from any zone it currently sits in — the
 * operator can reflect any physical zone change (mill, bounce, reanimation,
 * a corrected mistake, ...). Tokens ignore this when leaving the
 * battlefield — they cease to exist regardless of the chosen destination.
 * `battlefield` is only reachable for cards whose effect is `CreateCreature`
 * (see `buildBattlefieldCreatureFromCard` in templates.ts) — everything else
 * has no permanent body to put into play.
 */
export type CardDestination =
  | { zone: 'graveyard' }
  | { zone: 'hand' }
  | { zone: 'exile' }
  | { zone: 'library'; position: LibraryPosition }
  | { zone: 'battlefield' }

export interface GameConfig {
  playerCount: number
  drawPerTurn: number
  startingLife: number
}

/**
 * `resolvingTurn`: the bot's turn is being revealed one card at a time (see
 * `PendingTurn`) — the table gets to decide whether to respond to each card
 * before the next one is shown, instead of seeing the whole turn at once.
 */
export type GamePhase = 'idle' | 'resolvingTurn' | 'awaitingAttackOutcome'
export type GameStatus = 'ongoing' | 'botDefeated'

/** One line of the bot's turn report; carries the card's image when the line is tied to a specific card. */
export interface TurnLogEntry {
  text: string
  imageUrl?: string
}

/**
 * Bookkeeping for a bot turn currently being revealed card by card. The
 * query answers are collected once, up front, and reused as each card in
 * `bot.hand` (which doubles as the turn's remaining queue — see
 * `orderHandForResolution` in botTurnEngine.ts) is individually resolved or
 * countered. `extraDraws` accumulates any `DrawExtraBot` bonus draws seen so
 * far, folded into the next turn's hand size once the queue empties.
 */
export interface PendingTurn {
  queryAnswers: Record<string, number>
  extraDraws: number
}

export interface GameState {
  config: GameConfig
  /** Snapshot of the deck used to start this game, so later deck-builder edits don't retroactively break an in-progress game. */
  deckSnapshot: DeckCardConfig[]
  bot: BotState
  turnLog: TurnLogEntry[]
  turnNumber: number
  phase: GamePhase
  status: GameStatus
  pendingAttackers: BattlefieldCreature[] | null
  pendingTurn: PendingTurn | null
}
