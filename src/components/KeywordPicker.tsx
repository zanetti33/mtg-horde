import { ALL_KEYWORDS, KEYWORD_LABELS, type Keyword } from '../types'

export function KeywordPicker({ selected, onChange }: { selected: Keyword[]; onChange: (kws: Keyword[]) => void }) {
  function toggle(kw: Keyword) {
    onChange(selected.includes(kw) ? selected.filter((k) => k !== kw) : [...selected, kw])
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_KEYWORDS.map((kw) => (
        <button
          key={kw}
          type="button"
          onClick={() => toggle(kw)}
          className={`rounded-full border px-2 py-0.5 text-xs transition ${
            selected.includes(kw) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          {KEYWORD_LABELS[kw]}
        </button>
      ))}
    </div>
  )
}
