import { useState } from 'react'
import { useAppState } from '../state/AppContext'
import { DECK_PRESETS } from '../data/presets'
import { hydrateMissingScryfallData } from '../scryfall/hydrate'
import type { DeckCardConfig } from '../types'

export function SetupScreen() {
  const { state, dispatch } = useAppState()
  const [playerCount, setPlayerCount] = useState(4)
  const [drawPerTurn, setDrawPerTurn] = useState(2)
  const [startingLife, setStartingLife] = useState(40)

  const canStart = state.deck.length > 0

  function loadPreset(deck: DeckCardConfig[]) {
    if (!confirm(`Replace the current deck (${state.deck.length} cards) with the preset (${deck.length} cards)? This can't be undone.`)) return
    // Fresh ids per load, so loading the same preset twice (or after edits) never collides with a stale copy still in localStorage.
    const cloned = deck.map((c) => ({ ...c, id: crypto.randomUUID() }))
    dispatch({ type: 'SET_DECK', deck: cloned })
    hydrateMissingScryfallData(cloned, dispatch)
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="mb-1 text-xl font-semibold">New game</h2>
      <p className="mb-6 text-sm text-slate-400">
        The bot will only track its own state. Players' life and board stay managed physically at the table.
      </p>

      <div className="mb-6">
        <span className="mb-1 block text-sm font-medium text-slate-300">Bot deck</span>
        <p className="mb-2 text-xs text-slate-500">
          {state.deck.length} card{state.deck.length === 1 ? '' : 's'}. Choose a prebuilt deck, or fine-tune the current one from the "Bot deck"
          tab. Once the game starts, the deck stays locked for its entire duration.
        </p>
        <div className="flex flex-wrap gap-2">
          {DECK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => loadPreset(preset.deck)}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              {preset.label} ({preset.deck.length})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">Number of players</span>
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
          <span className="mb-1 block text-sm font-medium text-slate-300">Bot draws per turn</span>
          <input
            type="number"
            min={1}
            max={10}
            value={drawPerTurn}
            onChange={(e) => setDrawPerTurn(Number(e.target.value))}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          />
          <span className="mt-1 block text-xs text-slate-500">Main difficulty lever against {playerCount} players.</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">Bot starting life</span>
          <input
            type="number"
            min={1}
            value={startingLife}
            onChange={(e) => setStartingLife(Number(e.target.value))}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          />
        </label>
      </div>

      {!canStart && <p className="mt-4 text-sm text-amber-400">The bot's deck is empty — add cards from the "Bot deck" tab before starting.</p>}

      <button
        disabled={!canStart}
        onClick={() => dispatch({ type: 'START_GAME', config: { playerCount, drawPerTurn, startingLife } })}
        className="mt-6 w-full rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Start game
      </button>
    </div>
  )
}
