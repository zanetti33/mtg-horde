import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../state/AppContext'
import { summarizeEffect } from '../engine/effectSummary'

const WEIGHT_OPTIONS: { value: number; label: string; activeClass: string }[] = [
  { value: 1, label: '1 — Low', activeClass: 'bg-emerald-500 text-slate-950' },
  { value: 2, label: '2 — Medium', activeClass: 'bg-amber-500 text-slate-950' },
  { value: 3, label: '3 — High', activeClass: 'bg-rose-500 text-slate-950' },
]

const STRIP_COLOR: Record<number, string> = {
  1: 'border-emerald-600',
  2: 'border-amber-600',
  3: 'border-rose-600',
}

/**
 * Dev-only triage view: swipe through the active deck one card at a time and (re)assign its
 * `impact` weight, instead of opening each card's edit panel in the DeckBuilder list. Operates
 * directly on `state.deck` regardless of whether it's a locked preset — this is a developer tool
 * for tuning the shipped decks (see `zombieDeck.ts` / `dinosaurDeck.ts`), not a player-facing editor, so it
 * intentionally bypasses the DeckBuilder's read-only lock.
 */
export function CardWeighTriage() {
  const { state, dispatch } = useAppState()
  const deck = state.deck
  const [index, setIndex] = useState(0)
  const card = deck[index]

  useEffect(() => {
    if (index >= deck.length && deck.length > 0) setIndex(deck.length - 1)
  }, [deck.length, index])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (deck.length === 0) return
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, deck.length - 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      else if (e.key === '1' || e.key === '2' || e.key === '3') setWeight(Number(e.key))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.length, index])

  function setWeight(impact: number) {
    if (!card) return
    dispatch({ type: 'UPDATE_DECK_CARD_IMPACT', id: card.id, impact })
    setIndex((i) => Math.min(i + 1, deck.length - 1))
  }

  const counts = useMemo(() => {
    const c: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    for (const d of deck) c[d.impact ?? 1] = (c[d.impact ?? 1] ?? 0) + 1
    return c
  }, [deck])

  if (deck.length === 0) return <p className="text-sm text-slate-500">The deck is empty — nothing to weigh.</p>
  if (!card) return null

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          {state.deckSource} deck · card {index + 1} / {deck.length}
        </span>
        <span className="flex gap-3 text-xs">
          <span className="text-emerald-400">Low {counts[1] ?? 0}</span>
          <span className="text-amber-400">Med {counts[2] ?? 0}</span>
          <span className="text-rose-400">High {counts[3] ?? 0}</span>
        </span>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center">
        {card.scryfall?.imageUrl ? (
          <img src={card.scryfall.imageUrl} alt={card.scryfallName} className="mx-auto h-80 w-auto rounded-lg shadow-lg" />
        ) : (
          <div className="mx-auto flex h-80 w-56 items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-500">
            No image
          </div>
        )}
        <p className="mt-3 text-lg font-semibold text-slate-100">{card.scryfallName}</p>
        <p className="mt-1 text-xs text-slate-400">{summarizeEffect(card.effect)}</p>

        <div className="mt-4 flex justify-center gap-2">
          {WEIGHT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setWeight(opt.value)}
              className={`rounded px-3 py-2 text-sm font-medium transition ${
                (card.impact ?? 1) === opt.value ? opt.activeClass : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-600">Keys: ← → to move · 1 2 3 to set weight and advance</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
          className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          onClick={() => setIndex((i) => Math.min(i + 1, deck.length - 1))}
          disabled={index === deck.length - 1}
          className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {deck.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setIndex(i)}
            title={`${d.scryfallName} — impact ${d.impact ?? 1}`}
            className={`h-8 w-8 overflow-hidden rounded border-2 ${STRIP_COLOR[d.impact ?? 1]} ${i === index ? 'ring-2 ring-slate-100' : ''}`}
          >
            {d.scryfall?.imageUrl ? (
              <img src={d.scryfall.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-slate-800 text-[9px] text-slate-500">?</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
