import { useState } from 'react'
import { AppProvider, useAppState } from './state/AppContext'
import { DeckBuilder } from './components/DeckBuilder'
import { SetupScreen } from './components/SetupScreen'
import { GameBoard } from './components/GameBoard'

type View = 'deck' | 'game'

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
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {view === 'deck' && <DeckBuilder />}
        {view === 'game' && (state.game ? <GameBoard /> : <SetupScreen />)}
      </main>
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
