import type { BattlefieldCreature, BotState, CardDestination, CardRef, DeckCardConfig, EffectParams, GameConfig, GameState, LibraryPosition, ScryfallCardData, TurnLogEntry, Zone } from '../types'
import {
  counterSingleCard,
  declareAttackers,
  drawForTurn,
  drawNextTurnHand,
  findDeckCard,
  orderHandForResolution,
  recomputeStatus,
  resolveSingleCard,
} from '../engine/botTurnEngine'
import { buildBattlefieldCreatureFromCard } from '../engine/templates'

/** Inserts `ref` into `library` at the given position. `nth` is 1-indexed from the top and clamped to the array bounds. */
function insertIntoLibrary(library: CardRef[], ref: CardRef, position: LibraryPosition): CardRef[] {
  switch (position.kind) {
    case 'top':
      return [ref, ...library]
    case 'bottom':
      return [...library, ref]
    case 'nth': {
      const index = Math.min(Math.max(position.n - 1, 0), library.length)
      return [...library.slice(0, index), ref, ...library.slice(index)]
    }
  }
}

export interface AppState {
  deck: DeckCardConfig[]
  game: GameState | null
}

export type AppAction =
  | { type: 'SET_DECK'; deck: DeckCardConfig[] }
  | { type: 'ADD_DECK_CARD'; card: DeckCardConfig }
  | { type: 'REMOVE_DECK_CARD'; id: string }
  | { type: 'UPDATE_DECK_CARD_EFFECT'; id: string; effect: EffectParams }
  | { type: 'UPDATE_DECK_CARD_ERRATA'; id: string; errata: string | undefined }
  | { type: 'UPDATE_DECK_CARD_SCRYFALL'; id: string; scryfall: ScryfallCardData }
  | { type: 'START_GAME'; config: GameConfig }
  | { type: 'BEGIN_BOT_TURN'; queryAnswers: Record<string, number> }
  | { type: 'RESOLVE_TURN_CARD'; countered: boolean }
  | { type: 'CONFIRM_ATTACK_OUTCOME'; survivingInstanceIds: string[] }
  | { type: 'SET_BOT_LIFE'; life: number }
  | { type: 'MOVE_CARD'; instanceId: string; origin: Zone; destination: CardDestination }
  | { type: 'RESET_GAME' }
  | { type: 'LOAD_STATE'; deck: DeckCardConfig[]; game: GameState | null }

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function newInstanceId(): string {
  return crypto.randomUUID()
}

/** Removes a card by instance id from whichever zone array it's tracked in. */
function removeFromZone(bot: BotState, origin: Zone, instanceId: string): { bot: BotState; ref?: CardRef; creature?: BattlefieldCreature } {
  switch (origin) {
    case 'library':
      return { bot: { ...bot, library: bot.library.filter((r) => r.instanceId !== instanceId) }, ref: bot.library.find((r) => r.instanceId === instanceId) }
    case 'hand':
      return { bot: { ...bot, hand: bot.hand.filter((r) => r.instanceId !== instanceId) }, ref: bot.hand.find((r) => r.instanceId === instanceId) }
    case 'graveyard':
      return { bot: { ...bot, graveyard: bot.graveyard.filter((r) => r.instanceId !== instanceId) }, ref: bot.graveyard.find((r) => r.instanceId === instanceId) }
    case 'exile':
      return { bot: { ...bot, exile: bot.exile.filter((r) => r.instanceId !== instanceId) }, ref: bot.exile.find((r) => r.instanceId === instanceId) }
    case 'battlefield':
      return {
        bot: { ...bot, battlefield: bot.battlefield.filter((c) => c.instanceId !== instanceId) },
        creature: bot.battlefield.find((c) => c.instanceId === instanceId),
      }
  }
}

/**
 * Moves a card, by instance id, from any bot zone to any other — the
 * general-purpose operation behind every "send this card somewhere else"
 * action the operator can take from BotPanel (mill, bounce, reanimation,
 * fixing a mistake, ...), not just creatures leaving the battlefield.
 */
function moveCard(bot: BotState, deckSnapshot: DeckCardConfig[], instanceId: string, origin: Zone, destination: CardDestination): BotState {
  const { bot: next, ref, creature } = removeFromZone(bot, origin, instanceId)
  // Instance not actually in the stated origin zone — no-op rather than acting on nothing.
  if (!ref && !creature) return bot

  // Tokens cease to exist the moment they'd change zones, per Magic's rules, whatever destination was picked.
  if (creature?.isToken) return next

  if (destination.zone === 'battlefield') {
    const deckCardId = ref?.deckCardId ?? creature?.sourceDeckCardId
    const card = deckCardId ? deckSnapshot.find((c) => c.id === deckCardId) : undefined
    const newCreature = card ? buildBattlefieldCreatureFromCard(card, instanceId) : null
    // No creature-effect card behind this instance — nothing sensible to put into play. Leave the
    // card where it was rather than silently destroying it by removing without re-adding anywhere.
    if (!newCreature) return bot
    return { ...next, battlefield: [...next.battlefield, newCreature] }
  }

  const newRef: CardRef | undefined = ref ?? (creature?.sourceDeckCardId ? { instanceId, deckCardId: creature.sourceDeckCardId } : undefined)
  if (!newRef) return next

  switch (destination.zone) {
    case 'graveyard':
      return { ...next, graveyard: [...next.graveyard, newRef] }
    case 'hand':
      return { ...next, hand: [...next.hand, newRef] }
    case 'exile':
      return { ...next, exile: [...next.exile, newRef] }
    case 'library':
      return { ...next, library: insertIntoLibrary(next.library, newRef, destination.position) }
  }
}

function startGame(deck: DeckCardConfig[], config: GameConfig): GameState {
  const library: CardRef[] = shuffle(deck).map((card) => ({
    instanceId: newInstanceId(),
    deckCardId: card.id,
  }))

  // Drawn immediately, same as the hand drawn at the end of every later turn (see
  // resolveBotTurn): the players' very first turns precede the bot's first turn, so
  // the bot's opening hand needs to already be sitting there for them to interact with.
  const bot: BotState = drawForTurn(
    { life: config.startingLife, library, hand: [], battlefield: [], graveyard: [], exile: [] },
    config.drawPerTurn,
  )

  return {
    config,
    deckSnapshot: deck,
    bot,
    turnLog: [],
    turnNumber: 0,
    phase: 'idle',
    status: recomputeStatus(bot),
    pendingAttackers: null,
    pendingTurn: null,
  }
}

/** Ends a bot turn once its card queue is empty: declares attackers, draws the next turn's hand, and recomputes status. Called either right after BEGIN_BOT_TURN (empty hand — nothing to reveal) or from the last RESOLVE_TURN_CARD. */
function finalizeBotTurn(game: GameState, bot: BotState, turnLogSoFar: TurnLogEntry[], extraDraws: number): GameState {
  const { attackers, logLine: attackLogLine } = declareAttackers(bot.battlefield)
  const { hand, library, logLine: drawLogLine } = drawNextTurnHand(bot.library, game.config.drawPerTurn, extraDraws)
  const turnLog = drawLogLine ? [...turnLogSoFar, attackLogLine, drawLogLine] : [...turnLogSoFar, attackLogLine]
  const newBot: BotState = { ...bot, hand, library }

  return {
    ...game,
    bot: newBot,
    turnLog,
    turnNumber: game.turnNumber + 1,
    phase: attackers.length > 0 ? 'awaitingAttackOutcome' : 'idle',
    status: recomputeStatus(newBot),
    pendingAttackers: attackers.length > 0 ? attackers : null,
    pendingTurn: null,
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DECK':
      return { ...state, deck: action.deck }

    case 'ADD_DECK_CARD':
      return { ...state, deck: [...state.deck, action.card] }

    case 'REMOVE_DECK_CARD':
      return { ...state, deck: state.deck.filter((c) => c.id !== action.id) }

    case 'UPDATE_DECK_CARD_EFFECT':
      return { ...state, deck: state.deck.map((c) => (c.id === action.id ? { ...c, effect: action.effect } : c)) }

    case 'UPDATE_DECK_CARD_ERRATA':
      return { ...state, deck: state.deck.map((c) => (c.id === action.id ? { ...c, errata: action.errata } : c)) }

    case 'UPDATE_DECK_CARD_SCRYFALL':
      return { ...state, deck: state.deck.map((c) => (c.id === action.id ? { ...c, scryfall: action.scryfall } : c)) }

    case 'START_GAME':
      return { ...state, game: startGame(state.deck, action.config) }

    case 'BEGIN_BOT_TURN': {
      if (!state.game || state.game.phase !== 'idle') return state
      const battlefield = state.game.bot.battlefield.map((c) => ({ ...c, summoningSick: false }))
      const hand = orderHandForResolution(state.game.bot.hand, state.game.deckSnapshot)
      const bot: BotState = { ...state.game.bot, battlefield, hand }

      // Nothing to reveal card by card this turn — skip straight to attackers + next draw.
      if (hand.length === 0) {
        return { ...state, game: finalizeBotTurn(state.game, bot, [], 0) }
      }

      return {
        ...state,
        game: { ...state.game, bot, turnLog: [], phase: 'resolvingTurn', pendingTurn: { queryAnswers: action.queryAnswers, extraDraws: 0 } },
      }
    }

    case 'RESOLVE_TURN_CARD': {
      if (!state.game || state.game.phase !== 'resolvingTurn' || !state.game.pendingTurn) return state
      const [ref, ...restHand] = state.game.bot.hand
      if (!ref) return state
      const card = findDeckCard(state.game.deckSnapshot, ref.deckCardId)

      const result = action.countered
        ? counterSingleCard(state.game.bot, ref, card)
        : resolveSingleCard(state.game.bot, ref, card, state.game.pendingTurn.queryAnswers)

      const bot: BotState = { ...result.bot, hand: restHand }
      const turnLog = [...state.game.turnLog, result.logLine]
      const extraDraws = state.game.pendingTurn.extraDraws + result.extraDraws

      if (restHand.length === 0) {
        return { ...state, game: finalizeBotTurn(state.game, bot, turnLog, extraDraws) }
      }

      return { ...state, game: { ...state.game, bot, turnLog, pendingTurn: { ...state.game.pendingTurn, extraDraws } } }
    }

    case 'CONFIRM_ATTACK_OUTCOME': {
      if (!state.game || !state.game.pendingAttackers) return state
      const attackerIds = new Set(state.game.pendingAttackers.map((c) => c.instanceId))
      const survivingIds = new Set(action.survivingInstanceIds)
      const fallen = state.game.pendingAttackers.filter((c) => !survivingIds.has(c.instanceId))
      const fallenNonTokenRefs: CardRef[] = fallen
        .filter((c) => !c.isToken && c.sourceDeckCardId)
        .map((c) => ({ instanceId: c.instanceId, deckCardId: c.sourceDeckCardId! }))

      const battlefield = state.game.bot.battlefield.filter((c) => !attackerIds.has(c.instanceId) || survivingIds.has(c.instanceId))
      const bot = { ...state.game.bot, battlefield, graveyard: [...state.game.bot.graveyard, ...fallenNonTokenRefs] }

      return {
        ...state,
        game: {
          ...state.game,
          bot,
          phase: 'idle',
          pendingAttackers: null,
          status: recomputeStatus(bot),
        },
      }
    }

    case 'SET_BOT_LIFE': {
      if (!state.game) return state
      const bot = { ...state.game.bot, life: action.life }
      return { ...state, game: { ...state.game, bot, status: recomputeStatus(bot) } }
    }

    case 'MOVE_CARD': {
      if (!state.game) return state
      const bot = moveCard(state.game.bot, state.game.deckSnapshot, action.instanceId, action.origin, action.destination)
      return { ...state, game: { ...state.game, bot, status: recomputeStatus(bot) } }
    }

    case 'RESET_GAME':
      return { ...state, game: null }

    case 'LOAD_STATE':
      return { deck: action.deck, game: action.game }

    default:
      return state
  }
}

export const initialAppState: AppState = { deck: [], game: null }
