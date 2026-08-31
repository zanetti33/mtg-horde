import { useState } from 'react'
import { useAppState } from '../state/AppContext'

export function SetupScreen() {
  const { state, dispatch } = useAppState()
  const [playerCount, setPlayerCount] = useState(4)
  const [drawPerTurn, setDrawPerTurn] = useState(2)
  const [startingLife, setStartingLife] = useState(40)

  const canStart = state.deck.length > 0

  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="mb-1 text-xl font-semibold">Nuova partita</h2>
      <p className="mb-6 text-sm text-slate-400">
        Il bot terrà traccia solo del proprio stato. Vita e board dei giocatori restano gestite fisicamente al tavolo.
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">Numero di giocatori</span>
          <input
            type="number"
            min={1}
            max={8}
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">Pescate del bot per turno</span>
          <input
            type="number"
            min={1}
            max={10}
            value={drawPerTurn}
            onChange={(e) => setDrawPerTurn(Number(e.target.value))}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          />
          <span className="mt-1 block text-xs text-slate-500">Leva principale di difficoltà contro {playerCount} giocatori.</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">Vita iniziale del bot</span>
          <input
            type="number"
            min={1}
            value={startingLife}
            onChange={(e) => setStartingLife(Number(e.target.value))}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          />
        </label>
      </div>

      {!canStart && <p className="mt-4 text-sm text-amber-400">Il mazzo del bot è vuoto — aggiungi carte dalla scheda "Mazzo del bot" prima di iniziare.</p>}

      <button
        disabled={!canStart}
        onClick={() => dispatch({ type: 'START_GAME', config: { playerCount, drawPerTurn, startingLife } })}
        className="mt-6 w-full rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Avvia partita
      </button>
    </div>
  )
}
