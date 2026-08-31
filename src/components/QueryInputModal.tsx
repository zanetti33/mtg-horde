import { useState } from 'react'
import type { QueryPrompt } from '../engine/templates'

export function QueryInputModal({ prompts, onSubmit, onCancel }: { prompts: QueryPrompt[]; onSubmit: (answers: Record<string, number>) => void; onCancel: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>(() => Object.fromEntries(prompts.map((p) => [p.key, 0])))

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-1 text-lg font-semibold text-slate-100">Domande prima di risolvere il turno</h3>
        <p className="mb-4 text-sm text-slate-400">Guarda il tavolo fisico e rispondi: queste carte scalano in base allo stato dei giocatori.</p>

        <div className="space-y-3">
          {prompts.map((p) => (
            <label key={p.key} className="block">
              <span className="mb-1 block text-sm text-slate-300">
                <span className="font-medium text-slate-100">{p.cardName}</span> — {p.prompt}
              </span>
              <input
                type="number"
                min={0}
                value={answers[p.key]}
                onChange={(e) => setAnswers((a) => ({ ...a, [p.key]: Number(e.target.value) }))}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800">
            Annulla
          </button>
          <button onClick={() => onSubmit(answers)} className="rounded bg-emerald-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400">
            Risolvi turno
          </button>
        </div>
      </div>
    </div>
  )
}
