import { useEffect } from 'react'
import { useAppState } from '../state/AppContext'
import { resolveSingleCard } from '../engine/botTurnEngine'
import { CardThumbnail } from './CardThumbnail'

/**
 * Shows the next (and only the next) card in the bot's turn queue, with the
 * table's two options: let it resolve, or counter it before its effect
 * happens. This is what makes "counter this specific bot spell" a real
 * decision — the table sees one card at a time and has to commit before
 * knowing what the bot would play after it, instead of reading the whole
 * turn's log at once.
 */
export function CurrentCardReveal() {
  const { state, dispatch } = useAppState()
  const game = state.game
  const active = !!game && game.phase === 'resolvingTurn' && !!game.pendingTurn
  const ref = active ? game!.bot.hand[0] : undefined
  const card = ref ? game!.deckSnapshot.find((c) => c.id === ref.deckCardId) : undefined

  // Enter/Escape mirror the two buttons below — the table's hands are usually full of physical
  // cards mid-turn, so a keyboard shortcut for the single most-repeated decision each turn matters
  // more here than almost anywhere else in the app.
  useEffect(() => {
    if (!active || !ref || !card) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') dispatch({ type: 'RESOLVE_TURN_CARD', countered: false })
      else if (e.key === 'Escape') dispatch({ type: 'RESOLVE_TURN_CARD', countered: true })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, ref, card, dispatch])

  if (!game || !active || !ref || !card || !game.pendingTurn) return null

  // Pure preview of what "Resolve" would apply — recomputed identically inside the reducer on
  // confirm, from the same (unchanged, since we're blocking on this choice) game state.
  const preview = resolveSingleCard(game.bot, ref, card)
  const prefix = `The bot casts ${card.scryfallName}: `
  const effectText = preview.logLine.text.startsWith(prefix) ? preview.logLine.text.slice(prefix.length) : preview.logLine.text
  const remaining = game.bot.hand.length - 1

  return (
    <div className="rounded-lg border-2 border-amber-600/70 bg-amber-950/20 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">
        The bot reveals the next card — decide whether to respond before continuing
      </p>
      <div className="flex items-start gap-3">
        {card.scryfall?.imageUrl && <CardThumbnail imageUrl={card.scryfall.imageUrl} alt={card.scryfallName} className="h-28 w-auto rounded" />}
        <div>
          <p className="text-lg font-semibold text-slate-100">{card.scryfallName}</p>
          <p className="text-sm text-slate-300">{effectText}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {remaining === 0 ? 'Last card this turn.' : `${remaining} card${remaining === 1 ? '' : 's'} still to reveal after this one.`}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => dispatch({ type: 'RESOLVE_TURN_CARD', countered: false })}
          className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
        >
          Resolve <span className="text-emerald-900">(Enter)</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'RESOLVE_TURN_CARD', countered: true })}
          className="rounded border border-red-700 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950"
        >
          Countered (no effect) <span className="text-red-500">(Esc)</span>
        </button>
      </div>
    </div>
  )
}
