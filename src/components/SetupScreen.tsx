import { useState } from 'react'
import { useAppState } from '../state/AppContext'
import { DECK_PRESETS, type DeckPreset } from '../data/presets'
import { hydrateMissingScryfallData } from '../scryfall/hydrate'
import { computeBaseDrawCount, computeStartingBotLife, computeSuggestedPlayersLife, DIFFICULTY_LABELS } from '../engine/difficulty'
import { CUSTOM_DECK_SOURCE, type Difficulty } from '../types'

export function SetupScreen() {
  const { state, dispatch } = useAppState()
  const [playerCount, setPlayerCount] = useState(4)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  const canStart = state.deck.length > 0

  function loadPreset(preset: DeckPreset) {
    if (!confirm(`Replace the current deck (${state.deck.length} cards) with the "${preset.label}" preset (${preset.deck.length} cards)? This can't be undone.`)) return
    // Fresh ids per load, so loading the same preset twice (or after edits) never collides with a stale copy still in localStorage.
    const cloned = preset.deck.map((c) => ({ ...c, id: crypto.randomUUID() }))
    dispatch({ type: 'SET_DECK', deck: cloned, source: preset.label })
    hydrateMissingScryfallData(cloned, dispatch)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-4 text-xl font-semibold">New game</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-base font-semibold text-slate-200">Bot deck</h3>
            <span className="text-xs text-slate-500">
              {state.deck.length} card{state.deck.length === 1 ? '' : 's'} — {state.deckSource === CUSTOM_DECK_SOURCE ? 'Custom' : state.deckSource}
            </span>
          </div>
          <div className="space-y-2">
            {DECK_PRESETS.map((preset) => {
              const active = state.deckSource === preset.label
              return (
                <div key={preset.label} className={`rounded border p-3 ${active ? 'border-emerald-600 bg-emerald-950/30' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${active ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {preset.label} ({preset.deck.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => loadPreset(preset)}
                      className={`shrink-0 rounded border px-2 py-1 text-xs transition ${
                        active ? 'border-emerald-600 bg-emerald-950 text-emerald-300' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {active ? 'Active ✓' : 'Load'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{preset.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="mb-3 text-base font-semibold text-slate-200">Game settings</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">Players</span>
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
                <span className="mb-1 block text-sm font-medium text-slate-300">Difficulty</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Opening hand: {computeBaseDrawCount(1, playerCount, difficulty)} card{computeBaseDrawCount(1, playerCount, difficulty) === 1 ? '' : 's'}.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-300">Bot life</span>
                <p className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100">{computeStartingBotLife(playerCount)}</p>
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-300">Players' life</span>
                <p className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100">{computeSuggestedPlayersLife(playerCount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!canStart && <p className="mt-4 text-sm text-amber-400">The bot's deck is empty — add cards from the "Bot deck" tab before starting.</p>}

      <button
        disabled={!canStart}
        onClick={() => dispatch({ type: 'START_GAME', config: { playerCount, difficulty } })}
        className="mt-4 w-full rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Start game
      </button>
    </div>
  )
}
