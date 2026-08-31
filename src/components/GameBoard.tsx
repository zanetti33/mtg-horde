import { useState } from 'react'
import { useAppState } from '../state/AppContext'
import { drawForTurn, getPendingQueries, type QueryPrompt } from '../engine/botTurnEngine'
import { BotPanel } from './BotPanel'
import { TurnLog } from './TurnLog'
import { AttackOutcome } from './AttackOutcome'
import { QueryInputModal } from './QueryInputModal'

export function GameBoard() {
  const { state, dispatch } = useAppState()
  const game = state.game
  const [pendingQueries, setPendingQueries] = useState<QueryPrompt[] | null>(null)

  if (!game) return null

  function playBotTurn() {
    if (!game) return
    const draft = drawForTurn(game.bot, game.config.drawPerTurn)
    const queries = getPendingQueries(draft.hand, game.deckSnapshot)
    if (queries.length > 0) {
      setPendingQueries(queries)
    } else {
      dispatch({ type: 'RESOLVE_BOT_TURN', queryAnswers: {} })
    }
  }

  const canPlayTurn = game.phase === 'idle' && game.status === 'ongoing'

  return (
    <div className="space-y-4">
      {game.status === 'botDefeated' && (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-4 text-center">
          <p className="text-lg font-semibold text-red-300">Il bot è stato sconfitto! I giocatori vincono.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={playBotTurn}
          disabled={!canPlayTurn}
          className="rounded bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Gioca turno bot
        </button>
        <button
          onClick={() => {
            if (confirm('Terminare la partita e tornare alla configurazione?')) dispatch({ type: 'RESET_GAME' })
          }}
          className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
        >
          Termina partita
        </button>
      </div>

      {game.phase === 'awaitingAttackOutcome' && <AttackOutcome />}

      <TurnLog lines={game.turnLog} turnNumber={game.turnNumber} />

      <BotPanel />

      {pendingQueries && (
        <QueryInputModal
          prompts={pendingQueries}
          onCancel={() => setPendingQueries(null)}
          onSubmit={(answers) => {
            dispatch({ type: 'RESOLVE_BOT_TURN', queryAnswers: answers })
            setPendingQueries(null)
          }}
        />
      )}
    </div>
  )
}
