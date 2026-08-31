import { useEffect, useRef, useState } from 'react'
import { useAppState } from '../state/AppContext'
import { autocompleteCardNames, getCardByName } from '../scryfall/api'
import { summarizeEffect } from '../engine/effectSummary'
import { defaultEffectFor } from '../engine/effectDefaults'
import { EffectForm } from './EffectForm'
import { downloadJSON, readJSONFile } from '../state/persistence'
import { hydrateMissingScryfallData } from '../scryfall/hydrate'
import type { DeckCardConfig, DeckConfig } from '../types'

function AddCardForm() {
  const { dispatch } = useAppState()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [chosenName, setChosenName] = useState<string | null>(null)
  const [effect, setEffect] = useState(() => defaultEffectFor('CreateCreature'))
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
    }, 200)
    return () => window.clearTimeout(debounceRef.current)
  }, [query])

  function reset() {
    setQuery('')
    setSuggestions([])
    setChosenName(null)
    setEffect(defaultEffectFor('CreateCreature'))
  }

  async function addCard() {
    const name = chosenName ?? query.trim()
    if (!name) return
    setAdding(true)
    // Resolve Scryfall data before dispatching: hydrating reactively after
    // the fact would need the deck-wide effect this app deliberately avoids
    // (see AppContext.tsx for why that caused a request storm).
    const scryfall = (await getCardByName(name)) ?? undefined
    const card: DeckCardConfig = { id: crypto.randomUUID(), scryfallName: scryfall?.name ?? name, effect, scryfall }
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
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        {suggestions.length > 0 && !chosenName && (
          <ul className="absolute z-10 mt-1 w-full rounded border border-slate-700 bg-slate-900 shadow-lg">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-800"
                  onClick={() => {
                    setChosenName(name)
                    setSuggestions([])
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EffectForm effect={effect} onChange={setEffect} />

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

function DeckCardRow({ card }: { card: DeckCardConfig }) {
  const { dispatch } = useAppState()
  const [editing, setEditing] = useState(false)

  return (
    <div className="rounded border border-slate-800 bg-slate-900/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {card.scryfall?.imageUrl && <img src={card.scryfall.imageUrl} alt={card.scryfallName} className="h-16 w-auto rounded" />}
          <div>
            <p className="font-medium text-slate-100">{card.scryfallName}</p>
            <p className="text-xs text-slate-400">{summarizeEffect(card.effect)}</p>
            {card.errata && <p className="mt-1 text-xs text-amber-400">Errata: {card.errata}</p>}
            {!card.scryfall && <p className="mt-1 text-xs text-amber-400">Scryfall data not loaded yet (image, cost) — retry with "Refresh cards with no data" below.</p>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setEditing((v) => !v)} className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">
            {editing ? 'Close' : 'Edit'}
          </button>
          <button onClick={() => dispatch({ type: 'REMOVE_DECK_CARD', id: card.id })} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-950">
            Remove
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
          <EffectForm effect={card.effect} onChange={(effect) => dispatch({ type: 'UPDATE_DECK_CARD_EFFECT', id: card.id, effect })} />
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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await readJSONFile<DeckConfig>(file)
      dispatch({ type: 'SET_DECK', deck: imported.cards })
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
            <DeckCardRow key={card.id} card={card} />
          ))}
          {state.deck.length === 0 && <p className="text-sm text-slate-500">The deck is empty.</p>}
        </div>
      </div>

      <div>
        <AddCardForm />
      </div>
    </div>
  )
}
