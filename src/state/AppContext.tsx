import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { appReducer, type AppAction, type AppState } from './gameReducer'
import { loadDeckConfig, loadDeckSource, loadGameState, saveDeckConfig, saveDeckSource, saveGameState } from './persistence'
import { DECK_PRESETS } from '../data/presets'
import { getCardByName } from '../scryfall/api'
import { CUSTOM_DECK_SOURCE } from '../types'

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | null>(null)

function loadInitialState(): AppState {
  const savedDeck = loadDeckConfig()
  const deck = savedDeck?.cards ?? DECK_PRESETS[0].deck
  // A saved deck with no recorded source predates this field — treat it as Custom (freely
  // editable) rather than guessing it matches a preset, since that's what it already was in
  // practice (nothing enforced presets being read-only before this).
  const deckSource = loadDeckSource() ?? (savedDeck ? CUSTOM_DECK_SOURCE : DECK_PRESETS[0].label)
  const game = loadGameState()
  return { deck, deckSource, game }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadInitialState)

  useEffect(() => {
    saveDeckConfig({ cards: state.deck })
  }, [state.deck])

  useEffect(() => {
    saveDeckSource(state.deckSource)
  }, [state.deckSource])

  useEffect(() => {
    saveGameState(state.game)
  }, [state.game])

  // Hydrate Scryfall data (name/mana cost/image) once at startup for any
  // deck card loaded from localStorage/defaults without it yet.
  //
  // This intentionally runs ONCE (empty deps), not reactively on
  // `state.deck`. An earlier version re-ran on every deck change so it could
  // pick up newly-added cards too — but each successful hydration dispatch
  // changed state.deck, which retriggered the effect, which cancelled the
  // in-flight pass and started a new one over the (mostly same) remaining
  // cards. The old pass kept fetching in the background even after being
  // "cancelled" (only its dispatch was skipped), so passes compounded
  // instead of replacing each other: dozens of duplicate in-flight requests
  // for the same handful of cards, most of them discarded on arrival,
  // tripping Scryfall's rate limit and leaving several cards stuck
  // perpetually unhydrated. Cards added later via the deck builder are
  // hydrated inline before they're ever dispatched (see AddCardForm), so no
  // reactive re-run is needed here at all.
  useEffect(() => {
    const missing = state.deck.filter((c) => !c.scryfall)

    async function hydrate() {
      for (const card of missing) {
        const data = await getCardByName(card.scryfallName)
        if (data) dispatch({ type: 'UPDATE_DECK_CARD_SCRYFALL', id: card.id, scryfall: data })
      }
    }
    if (missing.length > 0) hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within an AppProvider')
  return ctx
}
