import type { NumericValue } from '../types'
import { isQueryValue } from '../types'

function OptionalNumberField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <label className="flex flex-1 flex-col text-xs text-slate-500">
      {label}
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="mt-0.5 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
      />
    </label>
  )
}

/** Edits a NumericValue: either a fixed number, or a single-question formula (Archenemy-style scaling). */
export function NumericValueEditor({ label, value, onChange }: { label: string; value: NumericValue; onChange: (v: NumericValue) => void }) {
  const query = isQueryValue(value) ? value : null

  return (
    <div className="rounded border border-slate-800 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <label className="flex items-center gap-1 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={query !== null}
            onChange={(e) => onChange(e.target.checked ? { query: '', multiplier: 1, offset: 0 } : 0)}
          />
from query
        </label>
      </div>

      {query ? (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            placeholder="Question to ask (e.g. How many artifacts do the players control?)"
            value={query.query}
            onChange={(e) => onChange({ ...query, query: e.target.value })}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
          />
          <div className="flex gap-2">
            <OptionalNumberField label="multiply by" value={query.multiplier} onChange={(n) => onChange({ ...query, multiplier: n ?? 0 })} />
            <OptionalNumberField label="then +" value={query.offset} onChange={(n) => onChange({ ...query, offset: n ?? 0 })} />
            <OptionalNumberField label="minimum" value={query.min} onChange={(n) => onChange({ ...query, min: n })} />
            <OptionalNumberField label="maximum" value={query.max} onChange={(n) => onChange({ ...query, max: n })} />
          </div>
        </div>
      ) : (
        <input
          type="number"
          value={typeof value === 'number' ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
        />
      )}
    </div>
  )
}
