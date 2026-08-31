import type { BattlefieldDestination, CardRef, DeckCardConfig, EffectParams, GameConfig, GameState, LibraryPosition, ScryfallCardData } from '../types'
import { drawForTurn, recomputeStatus, resolveBotTurn } from '../engine/botTurnEngine'

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
  | { type: 'RESOLVE_BOT_TURN'; queryAnswers: Record<string, number> }
  | { type: 'CONFIRM_ATTACK_OUTCOME'; survivingInstanceIds: string[] }
  | { type: 'SET_BOT_LIFE'; life: number }
  | { type: 'MOVE_BATTLEFIELD_CREATURE'; instanceId: string; destination: BattlefieldDestination }
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

function startGame(deck: DeckCardConfig[], config: GameConfig): GameState {
  const library: CardRef[] = shuffle(deck).map((card) => ({
    instanceId: newInstanceId(),
    deckCardId: card.id,
  }))

  return {
    config,
    deckSnapshot: deck,
    bot: {
      life: config.startingLife,
      library,
      hand: [],
      battlefield: [],
      graveyard: [],
      exile: [],
    },
    turnLog: [],
    turnNumber: 0,
    phase: 'idle',
    status: 'ongoing',
    pendingAttackers: null,
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

    case 'RESOLVE_BOT_TURN': {
      if (!state.game || state.game.phase !== 'idle') return state
      const drafted = drawForTurn(state.game.bot, state.game.config.drawPerTurn)
      const result = resolveBotTurn(drafted, state.game.deckSnapshot, action.queryAnswers)
      return {
        ...state,
        game: {
          ...state.game,
          bot: result.bot,
          turnLog: result.logLines,
          turnNumber: state.game.turnNumber + 1,
          phase: result.attackers.length > 0 ? 'awaitingAttackOutcome' : 'idle',
          status: result.status,
          pendingAttackers: result.attackers.length > 0 ? result.attackers : null,
        },
      }
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

    case 'MOVE_BATTLEFIELD_CREATURE': {
      if (!state.game) return state
      const removed = state.game.bot.battlefield.find((c) => c.instanceId === action.instanceId)
      const battlefield = state.game.bot.battlefield.filter((c) => c.instanceId !== action.instanceId)

      // Tokens cease to exist in any zone other than the battlefield, whatever destination was picked.
      let bot = { ...state.game.bot, battlefield }
      if (removed && !removed.isToken && removed.sourceDeckCardId) {
        const ref: CardRef = { instanceId: removed.instanceId, deckCardId: removed.sourceDeckCardId }
        const dest = action.destination
        switch (dest.zone) {
          case 'graveyard':
            bot = { ...bot, graveyard: [...bot.graveyard, ref] }
            break
          case 'hand':
            bot = { ...bot, hand: [...bot.hand, ref] }
            break
          case 'library':
            bot = { ...bot, library: insertIntoLibrary(bot.library, ref, dest.position) }
            break
          case 'exile':
            bot = { ...bot, exile: [...bot.exile, ref] }
            break
        }
      }
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
