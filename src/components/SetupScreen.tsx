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
    <div className="mx-auto max-w-md rounded-lg border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="mb-1 text-xl font-semibold">New game</h2>
      <p className="mb-6 text-sm text-slate-400">
        The bot will only track its own state. Players' life and board stay managed physically at the table.
      </p>

      <div className="mb-6">
        <span className="mb-1 block text-sm font-medium text-slate-300">Bot deck</span>
        <p className="mb-2 text-xs text-slate-500">
          {state.deck.length} card{state.deck.length === 1 ? '' : 's'} —{' '}
          {state.deckSource === CUSTOM_DECK_SOURCE ? (
            'Custom deck (freely editable).'
          ) : (
            <>
              Fixed <strong className="text-slate-300">{state.deckSource}</strong> preset. Fine-tune it from the "Bot deck" tab (you'll be asked to
              switch to Custom first).
            </>
          )}{' '}
          Once the game starts, the deck stays locked for its entire duration.
        </p>
        <div className="flex flex-wrap gap-2">
          {DECK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => loadPreset(preset)}
              className={`rounded border px-2 py-1 text-xs transition ${
                state.deckSource === preset.label
                  ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {preset.label} ({preset.deck.length}){state.deckSource === preset.label ? ' ✓' : ''}
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
          <span className="mt-1 block text-xs text-slate-500">
            Together with player count and turn number, shapes both how many cards the bot draws each turn and how quickly its draws skew toward
            its highest-impact cards. Opening hand this game: {computeBaseDrawCount(1, playerCount, difficulty)} card
            {computeBaseDrawCount(1, playerCount, difficulty) === 1 ? '' : 's'}.
          </span>
        </label>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-300">Bot starting life</span>
          <p className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100">{computeStartingBotLife(playerCount)}</p>
          <span className="mt-1 block text-xs text-slate-500">
            Scales with player count only — a bigger table throws more attackers and removal at the bot per turn, so it needs more life to last
            long enough to see the cards difficulty and turn number are meant to unlock.
          </span>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-300">Players' shared starting life</span>
          <p className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100">{computeSuggestedPlayersLife(playerCount)}</p>
          <span className="mt-1 block text-xs text-slate-500">
            Scales with player count. Just a shared counter for convenience — the app never reads it back after this, the table can freely adjust
            it during play, combat/effects on players are still resolved physically.
          </span>
        </div>
      </div>

      {!canStart && <p className="mt-4 text-sm text-amber-400">The bot's deck is empty — add cards from the "Bot deck" tab before starting.</p>}

      <button
        disabled={!canStart}
        onClick={() => dispatch({ type: 'START_GAME', config: { playerCount, difficulty } })}
        className="mt-6 w-full rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Start game
      </button>
    </div>
  )
}
