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

/**
 * Mana color, in Scryfall's own single-letter convention — colorless is the empty array, not a
 * value of this type. The engine never reads color/type (see game-design.md's "no Oracle text
 * interpretation" philosophy): they're stored purely so the table has something to look at when a
 * token has no card image to check — e.g. to know whether a players' anthem or removal spell that
 * cares about color/creature type applies to it.
 */
export type Color = 'W' | 'U' | 'B' | 'R' | 'G'

export const ALL_COLORS: Color[] = ['W', 'U', 'B', 'R', 'G']

export const COLOR_LABELS: Record<Color, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
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

// --- Effect templates -------------------------------------------------

/** Modifies bot-tracked state directly. */
export interface CreateCreatureEffect {
  kind: 'CreateCreature'
  count: number
  power: number
  toughness: number
  keywords: Keyword[]
  /** Display name for produced tokens when count > 1. Defaults to the card's own name. */
  tokenName?: string
  /** Creature type line for produced tokens (e.g. "Zombie", "Dinosaur Soldier") — only used when count > 1; a real card's own body already shows this on its Scryfall image. Superseded by `tokenScryfall.typeLine` when that's present. */
  tokenTypeLine?: string
  /** Colors for produced tokens — only used when count > 1, same reasoning as `tokenTypeLine`. Superseded by `tokenScryfall.colors` when that's present. */
  tokenColors?: Color[]
  /**
   * The real Scryfall *token* card (not the spell that creates it) matching this token's name/
   * power/toughness/keywords — e.g. for a card that makes "2/2 black Zombie" tokens, this is the
   * actual printed "Zombie" token card, not "Army of the Damned"'s own card. When present, it
   * supersedes `tokenTypeLine`/`tokenColors` and — unlike those two, which are text-only — also
   * gives the token a real image, exactly like a `count === 1` `CreateCreature` card gets its own
   * image from `DeckCardConfig.scryfall`. Populated the same way as that field: bundled locally for
   * the preset decks (`scripts/fetch-card-assets.mjs`/`attachLocalScryfallData.ts`), left undefined
   * for custom decks unless set by hand (no deck-builder UI for it yet).
   */
  tokenScryfall?: ScryfallCardData
}

export interface PumpBotBoardEffect {
  kind: 'PumpBotBoard'
  powerBonus: number
  toughnessBonus: number
  grantKeywords: Keyword[]
}

/** Non-creature type of a `CreatePermanent` card — purely a display label (Artifact vs Enchantment badge in BotPanel), same non-interpreted role as `Color`/`typeLine` elsewhere: the engine treats both identically. */
export type PermanentType = 'artifact' | 'enchantment'

/**
 * A static, persistent team-wide buff — the "real anthem" a real artifact/enchantment provides,
 * as opposed to `PumpBotBoard`'s one-shot version (see `game-design.md`'s note on that
 * simplification). Puts a `BotPermanent` into `BotState.permanents` instead of touching
 * `BattlefieldCreature` stats directly: the bonus is derived (see `getEffectiveStats` in
 * `engine/templates.ts`) everywhere a creature's stats are read, so it also applies to creatures
 * that enter play *after* this one resolves, and disappears again if the permanent is later
 * destroyed/exiled like any other card.
 */
export interface CreatePermanentEffect {
  kind: 'CreatePermanent'
  permanentType: PermanentType
  powerBonus: number
  toughnessBonus: number
  grantKeywords: Keyword[]
}

export interface GainLifeBotEffect {
  kind: 'GainLifeBot'
  amount: number
}

export interface DrawExtraBotEffect {
  kind: 'DrawExtraBot'
  amount: number
}

/** Generates only a text instruction for the table to resolve themselves — no tracked state is touched. */
export type RemovalMode = 'highestPower' | 'highestToughness' | 'highestManaValue' | 'random' | 'all'

export interface RemovalInstructionEffect {
  kind: 'RemovalInstruction'
  mode: RemovalMode
  count: number
  destroyOrExile: 'destroy' | 'exile'
}

export type DamageTarget = 'eachPlayer' | 'creatureHighestPower' | 'creatureHighestToughness' | 'creatureRandom' | 'allCreatures'

export interface DamageInstructionEffect {
  kind: 'DamageInstruction'
  amount: number
  target: DamageTarget
}

export interface SacrificeInstructionEffect {
  kind: 'SacrificeInstruction'
  perPlayer: boolean
  count: number
}

export interface DiscardInstructionEffect {
  kind: 'DiscardInstruction'
  perPlayer: boolean
  count: number
}

export type BotStateEffect = CreateCreatureEffect | PumpBotBoardEffect | CreatePermanentEffect | GainLifeBotEffect | DrawExtraBotEffect
export type TableInstructionEffect =
  | RemovalInstructionEffect
  | DamageInstructionEffect
  | SacrificeInstructionEffect
  | DiscardInstructionEffect

export type EffectParams = BotStateEffect | TableInstructionEffect
export type EffectTemplateId = EffectParams['kind']

export function isBotStateEffect(effect: EffectParams): effect is BotStateEffect {
  return (
    effect.kind === 'CreateCreature' ||
    effect.kind === 'PumpBotBoard' ||
    effect.kind === 'CreatePermanent' ||
    effect.kind === 'GainLifeBot' ||
    effect.kind === 'DrawExtraBot'
  )
}

// --- Deck configuration -------------------------------------------------

/**
 * Official tactical categorization of a deck card — orthogonal to `effect.kind` (which is about
 * how the engine resolves it) and to `impact` (how threatening it is). Assigned by whoever curates
 * the deck, not derived automatically, since the same `kind` can serve different tactical roles
 * (e.g. `PumpBotBoard` covers both a permanent `lord` and a one-shot `teamPump`).
 */
export type CardCategory =
  | 'horde' // 2+ creatures/tokens from one card, few or no keywords — swarm plays
  | 'bigBad' // a single creature with at least one keyword — a named threat, not just a body
  | 'grunt' // a single creature with no keyword — plain filler body
  | 'specificRemoval' // each player loses/sacrifices one creature of their own (edict, or a criterion like highest power)
  | 'aoe' // damage or -X/-X to all of the players' creatures — doesn't guarantee a full wipe
  | 'boardClear' // unconditionally destroys/exiles all of the players' creatures
  | 'lord' // permanent team-wide buff to the bot's board (anthem), regardless of the source's own type
  | 'teamPump' // one-shot team-wide buff (a combat trick, not a permanent anthem)
  | 'draw' // the bot draws extra cards
  | 'lifeGain' // the bot gains life
  | 'faceDamage' // damage/life loss straight to the players, bypassing creatures
  | 'discard' // forces the players to discard

export const ALL_CARD_CATEGORIES: CardCategory[] = [
  'horde',
  'bigBad',
  'grunt',
  'specificRemoval',
  'aoe',
  'boardClear',
  'lord',
  'teamPump',
  'draw',
  'lifeGain',
  'faceDamage',
  'discard',
]

export const CARD_CATEGORY_LABELS: Record<CardCategory, string> = {
  horde: 'Horde',
  bigBad: 'Big bad',
  grunt: 'Grunt',
  specificRemoval: 'Specific removal',
  aoe: 'AOE',
  boardClear: 'Board clear',
  lord: 'Lord',
  teamPump: 'Team pump',
  draw: 'Draw',
  lifeGain: 'Life gain',
  faceDamage: 'Face damage',
  discard: 'Discard',
}

export interface DeckCardConfig {
  /** Unique id for this deck entry (not the Scryfall id — allows duplicate copies of a card). */
  id: string
  scryfallName: string
  scryfall?: ScryfallCardData
  effect: EffectParams
  /**
   * How much of a threat this card is, used to weight how likely the bot is to draw it (see
   * `engine/difficulty.ts`) — higher draws more often as the game favors bigger threats (later
   * turns, more players, higher difficulty). A scalar so decks can eventually grade cards more
   * finely than three buckets, but for now stick to 1 (low), 2 (medium), 3 (high) impact.
   * Missing/undefined is treated as 1 (low) — e.g. cards added via the deck builder before this
   * was assigned by hand.
   */
  impact?: number
  /**
   * Official tactical category (see `CardCategory` above) — optional so cards added before this
   * field existed, or from the deck builder without picking one, stay valid. Missing/undefined
   * means "uncategorized", not a specific category.
   */
  category?: CardCategory
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

/**
 * Where the active deck came from: either the label of one of `DECK_PRESETS` (data/presets.ts) —
 * meaning it's a fixed, curated deck the deck builder shows read-only — or `CUSTOM_DECK_SOURCE`,
 * meaning it's been unlocked (or built/imported from scratch) and is freely editable.
 */
export type DeckSource = string
export const CUSTOM_DECK_SOURCE = 'Custom'

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
  /** Creature type line — from the card's own Scryfall data for real cards, from `tokenTypeLine`/a player's custom-token form for tokens. Purely informational, see `Color` above. */
  typeLine?: string
  /** Colors — same provenance/purpose as `typeLine`. */
  colors?: string[]
}

/** A resolved `CreatePermanent` card sitting in play — see that effect for why this is a separate zone from `battlefield` instead of a `BattlefieldCreature` flag: it's not a creature, so it never attacks/blocks and doesn't belong in the board grid. */
export interface BotPermanent {
  instanceId: string
  name: string
  imageUrl?: string
  permanentType: PermanentType
  powerBonus: number
  toughnessBonus: number
  grantKeywords: Keyword[]
  sourceDeckCardId: string
  /** Same provenance/purpose as `BattlefieldCreature.typeLine` — see `Color` above. */
  typeLine?: string
  colors?: string[]
}

export interface BotState {
  life: number
  library: CardRef[]
  hand: CardRef[]
  battlefield: BattlefieldCreature[]
  permanents: BotPermanent[]
  graveyard: CardRef[]
  exile: CardRef[]
}

/** Where in the library a card goes — `nth` is 1-indexed from the top (1 = top). */
export type LibraryPosition = { kind: 'top' } | { kind: 'bottom' } | { kind: 'nth'; n: number }

/** One of the bot's own tracked zones. */
export type Zone = 'library' | 'hand' | 'battlefield' | 'permanents' | 'graveyard' | 'exile'

/**
 * Where a bot card can be sent, from any zone it currently sits in — the
 * operator can reflect any physical zone change (mill, bounce, reanimation,
 * a corrected mistake, ...). Tokens ignore this when leaving the
 * battlefield — they cease to exist regardless of the chosen destination.
 * `battlefield` is only reachable for cards whose effect is `CreateCreature`
 * (see `buildBattlefieldCreatureFromCard` in templates.ts) — everything else
 * has no permanent body to put into play. `permanents` is the equivalent
 * destination for `CreatePermanent` cards (see `buildPermanentFromCard`).
 */
export type CardDestination =
  | { zone: 'graveyard' }
  | { zone: 'hand' }
  | { zone: 'exile' }
  | { zone: 'library'; position: LibraryPosition }
  | { zone: 'battlefield' }
  | { zone: 'permanents' }

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface GameConfig {
  playerCount: number
  difficulty: Difficulty
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
 * Bookkeeping for a bot turn currently being revealed card by card, as each
 * card in `bot.hand` (which doubles as the turn's remaining queue — see
 * `orderHandForResolution` in botTurnEngine.ts) is individually resolved or
 * countered. `extraDraws` accumulates any `DrawExtraBot` bonus draws seen so
 * far, folded into the next turn's hand size once the queue empties.
 */
export interface PendingTurn {
  extraDraws: number
}

export interface GameState {
  config: GameConfig
  /** Snapshot of the deck used to start this game, so later deck-builder edits don't retroactively break an in-progress game. */
  deckSnapshot: DeckCardConfig[]
  bot: BotState
  /**
   * Shared life total for the 4 players, tracked only as a convenience counter for the table to
   * display/adjust manually (like a physical life pad) — mirrors `bot.life`'s input pattern, but
   * no engine logic ever reads or writes it. It's not part of `BotState` since it isn't bot state.
   */
  playersLife: number
  turnLog: TurnLogEntry[]
  turnNumber: number
  phase: GamePhase
  status: GameStatus
  pendingAttackers: BattlefieldCreature[] | null
  pendingTurn: PendingTurn | null
}
