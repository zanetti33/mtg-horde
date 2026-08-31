import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { appReducer, type AppAction, type AppState } from './gameReducer'
import { loadDeckConfig, loadGameState, saveDeckConfig, saveGameState } from './persistence'
import { defaultDeck } from '../data/defaultDeck'
import { getCardByName } from '../scryfall/api'

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | null>(null)

function loadInitialState(): AppState {
  const deck = loadDeckConfig()?.cards ?? defaultDeck
  const game = loadGameState()
  return { deck, game }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadInitialState)

  useEffect(() => {
    saveDeckConfig({ cards: state.deck })
  }, [state.deck])

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
