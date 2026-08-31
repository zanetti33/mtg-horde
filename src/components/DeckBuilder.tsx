import { useEffect, useRef, useState } from 'react'
import { useAppState } from '../state/AppContext'
import { autocompleteCardNames, getCardByName } from '../scryfall/api'
import { summarizeEffect } from '../engine/effectSummary'
import { defaultEffectFor } from '../engine/effectDefaults'
import { EffectForm } from './EffectForm'
import { CardThumbnail } from './CardThumbnail'
import { downloadJSON, readJSONFile } from '../state/persistence'
import { hydrateMissingScryfallData } from '../scryfall/hydrate'
import { CUSTOM_DECK_SOURCE, type DeckCardConfig, type DeckConfig } from '../types'

const IMPACT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1 — Low' },
  { value: 2, label: '2 — Medium' },
  { value: 3, label: '3 — High' },
]

function ImpactSelect({ value, onChange }: { value: number; onChange: (impact: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-300">Impact</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
      >
        {IMPACT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function AddCardForm() {
  const { dispatch } = useAppState()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [chosenName, setChosenName] = useState<string | null>(null)
  const [effect, setEffect] = useState(() => defaultEffectFor('CreateCreature'))
  const [impact, setImpact] = useState(1)
  const [adding, setAdding] = useState(false)
  const debounceRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      const names = await autocompleteCardNames(query)
      setSuggestions(names.slice(0, 8))
      setHighlightedIndex(-1)
    }, 200)
    return () => window.clearTimeout(debounceRef.current)
  }, [query])

  function reset() {
    setQuery('')
    setSuggestions([])
    setHighlightedIndex(-1)
    setChosenName(null)
    setEffect(defaultEffectFor('CreateCreature'))
    setImpact(1)
  }

  function chooseSuggestion(name: string) {
    setChosenName(name)
    setSuggestions([])
    setHighlightedIndex(-1)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0 && !chosenName) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Escape') {
        setSuggestions([])
        setHighlightedIndex(-1)
        return
      }
      if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault()
        chooseSuggestion(suggestions[highlightedIndex])
        return
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      addCard()
    }
  }

  async function addCard() {
    const name = chosenName ?? query.trim()
    if (!name) return
    setAdding(true)
    // Resolve Scryfall data before dispatching: hydrating reactively after
    // the fact would need the deck-wide effect this app deliberately avoids
    // (see AppContext.tsx for why that caused a request storm).
    const scryfall = (await getCardByName(name)) ?? undefined
    const card: DeckCardConfig = { id: crypto.randomUUID(), scryfallName: scryfall?.name ?? name, effect, impact, scryfall }
    dispatch({ type: 'ADD_DECK_CARD', card })
    setAdding(false)
    reset()
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Add card to deck</h3>

      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search for a card on Scryfall…"
          value={chosenName ?? query}
          onChange={(e) => {
            setChosenName(null)
            setQuery(e.target.value)
          }}
          onKeyDown={handleSearchKeyDown}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        {suggestions.length > 0 && !chosenName && (
          <ul className="absolute z-10 mt-1 w-full rounded border border-slate-700 bg-slate-900 shadow-lg">
            {suggestions.map((name, i) => (
              <li key={name}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`block w-full px-3 py-1.5 text-left text-sm text-slate-200 ${i === highlightedIndex ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
                  onClick={() => chooseSuggestion(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {suggestions.length > 0 && !chosenName && <p className="mt-1 text-[11px] text-slate-600">↑↓ to navigate · Enter to pick</p>}
      </div>

      <EffectForm effect={effect} onChange={setEffect} />

      <div className="mt-3">
        <ImpactSelect value={impact} onChange={setImpact} />
      </div>

      <p className="mt-2 text-xs text-slate-500">Preview: {summarizeEffect(effect)}</p>

      <button
        onClick={addCard}
        disabled={!(chosenName ?? query.trim()) || adding}
        className="mt-3 w-full rounded bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {adding ? 'Searching Scryfall…' : 'Add to deck'}
      </button>
    </div>
  )
}

function DeckCardRow({ card, locked }: { card: DeckCardConfig; locked: boolean }) {
  const { dispatch } = useAppState()
  const [editing, setEditing] = useState(false)

  return (
    <div className="rounded border border-slate-800 bg-slate-900/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {card.scryfall?.imageUrl && <CardThumbnail imageUrl={card.scryfall.imageUrl} alt={card.scryfallName} className="h-16 w-auto rounded" />}
          <div>
            <p className="font-medium text-slate-100">{card.scryfallName}</p>
            <p className="text-xs text-slate-400">
              {summarizeEffect(card.effect)} · Impact {card.impact ?? 1}
            </p>
            {card.errata && <p className="mt-1 text-xs text-amber-400">Errata: {card.errata}</p>}
            {!card.scryfall && <p className="mt-1 text-xs text-amber-400">Scryfall data not loaded yet (image, cost) — retry with "Refresh cards with no data" below.</p>}
          </div>
        </div>
        {!locked && (
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setEditing((v) => !v)} className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">
              {editing ? 'Close' : 'Edit'}
            </button>
            <button onClick={() => dispatch({ type: 'REMOVE_DECK_CARD', id: card.id })} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-950">
              Remove
            </button>
          </div>
        )}
      </div>

      {!locked && editing && (
        <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
          <EffectForm effect={card.effect} onChange={(effect) => dispatch({ type: 'UPDATE_DECK_CARD_EFFECT', id: card.id, effect })} />
          <ImpactSelect value={card.impact ?? 1} onChange={(impact) => dispatch({ type: 'UPDATE_DECK_CARD_IMPACT', id: card.id, impact })} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Errata / custom rule (optional)</label>
            <textarea
              defaultValue={card.errata ?? ''}
              placeholder="Text that replaces the generated instruction, for cases where no template is enough on its own (e.g. modal choices that depend on the players' board)."
              onBlur={(e) => dispatch({ type: 'UPDATE_DECK_CARD_ERRATA', id: card.id, errata: e.target.value.trim() || undefined })}
              rows={2}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function DeckBuilder() {
  const { state, dispatch } = useAppState()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [refreshing, setRefreshing] = useState(false)
  const missingScryfall = state.deck.filter((c) => !c.scryfall)
  const locked = state.deckSource !== CUSTOM_DECK_SOURCE

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await readJSONFile<DeckConfig>(file)
      // An imported file isn't necessarily one of the app's own presets (and even if it happens to
      // match one byte-for-byte, there's no cheap way to tell) — treat it as Custom, editable right away.
      dispatch({ type: 'SET_DECK', deck: imported.cards, source: CUSTOM_DECK_SOURCE })
      hydrateMissingScryfallData(imported.cards, dispatch)
    } catch {
      alert('Invalid file: could not import the deck.')
    } finally {
      e.target.value = ''
    }
  }

  async function retryMissingScryfall() {
    setRefreshing(true)
    // Scryfall lookups already retry transient failures internally (see scryfall/api.ts) — this
    // button is for the rare case a card still came up empty (e.g. an import from before a fix),
    // not for routine hydration.
    await hydrateMissingScryfallData(missingScryfall, dispatch)
    setRefreshing(false)
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bot deck ({state.deck.length} cards)</h2>
          <div className="flex gap-2">
            <button
              onClick={() => downloadJSON('horde-deck.json', { cards: state.deck } satisfies DeckConfig)}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Export
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">
              Import
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {locked && (
          <div className="mb-3 rounded border border-sky-800 bg-sky-950/40 p-3 text-xs text-sky-200">
            <p>
              This is the fixed <strong>{state.deckSource}</strong> preset — cards are read-only, so it stays exactly as designed. To tweak it (add,
              remove, or re-tune cards), switch to Custom: it starts as an editable copy of what's shown here.
            </p>
            <button
              onClick={() => dispatch({ type: 'UNLOCK_CUSTOM_DECK' })}
              className="mt-2 rounded border border-sky-700 px-2 py-1 text-xs text-sky-200 hover:bg-sky-900"
            >
              Customize this deck
            </button>
          </div>
        )}

        {missingScryfall.length > 0 && (
          <button
            onClick={retryMissingScryfall}
            disabled={refreshing}
            className="mb-3 rounded border border-amber-700 px-2 py-1 text-xs text-amber-300 hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : `Refresh cards with no data (${missingScryfall.length})`}
          </button>
        )}

        <div className="space-y-2">
          {state.deck.map((card) => (
            <DeckCardRow key={card.id} card={card} locked={locked} />
          ))}
          {state.deck.length === 0 && <p className="text-sm text-slate-500">The deck is empty.</p>}
        </div>
      </div>

      <div>{locked ? <p className="text-sm text-slate-500">Switch to Custom (above) to add cards.</p> : <AddCardForm />}</div>
    </div>
  )
}
