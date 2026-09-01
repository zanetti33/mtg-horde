import { useEffect, useRef, useState } from 'react'
import type { Color, Keyword } from '../types'
import { KeywordPicker } from './KeywordPicker'
import { ColorPicker } from './ColorPicker'

export interface CustomTokenInput {
  name: string
  power: number
  toughness: number
  keywords: Keyword[]
  typeLine?: string
  colors: Color[]
}

/**
 * Lets the operator hand the bot a token that isn't backed by any deck card — e.g. a player casts
 * "create a 1/1 Fish for an opponent" or "the Horde gets a 3/3 Beast". Type/colors are free-form
 * here (unlike a real card's own Scryfall data) since the engine never reads them: they're purely
 * for the table to check against their own buffs/removal (see Color in types.ts).
 */
export function AddTokenModal({ onSubmit, onCancel }: { onSubmit: (token: CustomTokenInput) => void; onCancel: () => void }) {
  const [name, setName] = useState('Token')
  const [power, setPower] = useState(1)
  const [toughness, setToughness] = useState(1)
  const [typeLine, setTypeLine] = useState('')
  const [colors, setColors] = useState<Color[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
    nameInputRef.current?.select()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit({ name: name.trim() || 'Token', power, toughness, keywords, typeLine: typeLine.trim() || undefined, colors })
        }}
        className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-5"
      >
        <h3 className="mb-1 text-lg font-semibold text-slate-100">Add a token to the bot's board</h3>
        <p className="mb-4 text-sm text-slate-400">For when a players' card gives the Horde a token (e.g. "create a 1/1 Fish for an opponent").</p>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Name</span>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>

          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="mb-1 block text-sm text-slate-300">Power</span>
              <input
                type="number"
                value={power}
                onChange={(e) => setPower(Number(e.target.value))}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="block flex-1">
              <span className="mb-1 block text-sm text-slate-300">Toughness</span>
              <input
                type="number"
                value={toughness}
                onChange={(e) => setToughness(Number(e.target.value))}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Type line (optional)</span>
            <input
              type="text"
              value={typeLine}
              onChange={(e) => setTypeLine(e.target.value)}
              placeholder="e.g. Fish, Beast"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>

          <div>
            <span className="mb-1 block text-sm text-slate-300">Colors</span>
            <ColorPicker selected={colors} onChange={setColors} />
          </div>

          <div>
            <span className="mb-1 block text-sm text-slate-300">Keywords</span>
            <KeywordPicker selected={keywords} onChange={setKeywords} />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <span className="mr-auto text-xs text-slate-600">Enter to confirm · Esc to cancel</span>
          <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" className="rounded bg-emerald-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400">
            Add token
          </button>
        </div>
      </form>
    </div>
  )
}
