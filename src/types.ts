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
  flying: 'Volare',
  trample: 'Travolgere',
  deathtouch: 'Tocco letale',
  lifelink: 'Legame vitale',
  firststrike: 'Colpire per primo',
  doublestrike: 'Doppio colpo',
  menace: 'Minaccia',
  vigilance: 'Vigilanza',
  reach: 'Portata',
  haste: 'Prontezza',
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
   * per the usual deck-curation criteria (see docs/design-di-gioco.md).
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

/** Where a battlefield creature can be sent when removed. Tokens ignore this — they cease to exist regardless. */
export type BattlefieldDestination =
  | { zone: 'graveyard' }
  | { zone: 'hand' }
  | { zone: 'exile' }
  | { zone: 'library'; position: LibraryPosition }

export interface GameConfig {
  playerCount: number
  drawPerTurn: number
  startingLife: number
}

export type GamePhase = 'idle' | 'awaitingAttackOutcome'
export type GameStatus = 'ongoing' | 'botDefeated'

/** One line of the bot's turn report; carries the card's image when the line is tied to a specific card. */
export interface TurnLogEntry {
  text: string
  imageUrl?: string
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
}
