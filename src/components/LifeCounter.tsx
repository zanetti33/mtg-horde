const STEPS = [-10, -1, 1, 10] as const

/** A life total with quick +/-1 and +/-10 buttons flanking the raw number input, so common swings (a single hit, a board wipe) don't require typing. */
export function LifeCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <div className="flex items-center gap-1">
        {STEPS.slice(0, 2).map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(value + step)}
            className="h-7 w-7 rounded border border-slate-700 text-xs font-medium text-slate-300 transition hover:border-red-700 hover:bg-red-950/40 hover:text-red-300"
          >
            {step}
          </button>
        ))}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-center text-lg font-semibold text-slate-100"
        />
        {STEPS.slice(2).map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(value + step)}
            className="h-7 w-7 rounded border border-slate-700 text-xs font-medium text-slate-300 transition hover:border-emerald-600 hover:bg-emerald-950/40 hover:text-emerald-300"
          >
            +{step}
          </button>
        ))}
      </div>
    </div>
  )
}
