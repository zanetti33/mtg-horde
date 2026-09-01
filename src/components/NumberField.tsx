export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-1 flex-col text-xs text-slate-500">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
      />
    </label>
  )
}
