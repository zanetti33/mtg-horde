import { useState } from 'react'
import { AppProvider, useAppState } from './state/AppContext'
import { DeckBuilder } from './components/DeckBuilder'
import { SetupScreen } from './components/SetupScreen'
import { GameBoard } from './components/GameBoard'
import { CardWeighTriage } from './components/CardWeighTriage'

type View = 'deck' | 'game' | 'weigh'

function Shell() {
  const { state } = useAppState()
  const [view, setView] = useState<View>('game')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">Horde Bot</h1>
          <nav className="flex gap-1">
            <button
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${view === 'game' ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
              onClick={() => setView('game')}
            >
              Game
            </button>
            <button
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${view === 'deck' ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
              onClick={() => setView('deck')}
            >
              Bot deck ({state.deck.length})
            </button>
            {import.meta.env.DEV && (
              <button
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${view === 'weigh' ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
                onClick={() => setView('weigh')}
              >
                Weigh cards (dev)
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {view === 'deck' && <DeckBuilder />}
        {view === 'game' && (state.game ? <GameBoard /> : <SetupScreen />)}
        {view === 'weigh' && <CardWeighTriage />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-6 text-xs text-slate-600">
        Unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by
        Wizards. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC.
        Card data and images by <a href="https://scryfall.com" className="underline hover:text-slate-400">Scryfall</a>.
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
