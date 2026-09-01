import { useState } from 'react'
import { useAppState } from '../state/AppContext'
import { BotPanel } from './BotPanel'
import { TurnLog } from './TurnLog'
import { AttackOutcome } from './AttackOutcome'
import { CurrentCardReveal } from './CurrentCardReveal'
import { LifeCounter } from './LifeCounter'

export function GameBoard() {
  const { state, dispatch } = useAppState()
  const game = state.game
  // The turn now reveals one card at a time (CurrentCardReveal) — the full log is a reference for
  // "what already happened", not something that needs to stay in view, so it starts collapsed.
  const [showLog, setShowLog] = useState(false)

  if (!game) return null

  function playBotTurn() {
    if (!game) return
    // The hand about to be played was already drawn at the end of the previous turn (or at game
    // start), so it's exactly what's sitting in game.bot.hand right now. Once begun, the turn is
    // revealed one card at a time (CurrentCardReveal) rather than resolved all at once.
    dispatch({ type: 'BEGIN_BOT_TURN' })
  }

  const canPlayTurn = game.phase === 'idle' && game.status === 'ongoing'

  return (
    <div className="space-y-4">
      {game.status === 'botDefeated' && (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-4 text-center">
          <p className="text-lg font-semibold text-red-300">The bot has been defeated! The players win.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={playBotTurn}
            disabled={!canPlayTurn}
            className="rounded bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Play bot turn
          </button>
          <button
            onClick={() => {
              if (confirm('End the game and return to setup?')) dispatch({ type: 'RESET_GAME' })
            }}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
          >
            End game
          </button>
        </div>

        <LifeCounter
          label="Players' shared life"
          value={game.playersLife}
          onChange={(life) => dispatch({ type: 'SET_PLAYERS_LIFE', life })}
        />
      </div>

      {game.phase === 'resolvingTurn' && <CurrentCardReveal />}
      {game.phase === 'awaitingAttackOutcome' && <AttackOutcome />}

      {game.turnLog.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowLog((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-slate-100">
            <span>{showLog ? '▾' : '▸'}</span>
            Turn log ({game.turnLog.length})
          </button>
          {showLog && <TurnLog lines={game.turnLog} turnNumber={game.phase === 'resolvingTurn' ? game.turnNumber + 1 : game.turnNumber} />}
        </div>
      )}

      <BotPanel />
    </div>
  )
}
