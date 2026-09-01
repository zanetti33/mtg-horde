import { ALL_COLORS, COLOR_LABELS, type Color } from '../types'

/** Swatch colors for each mana color pip — chosen to stay legible on the app's dark background, not Scryfall's actual card-frame colors. */
export const COLOR_SWATCH: Record<Color, string> = {
  W: '#f0ead6',
  U: '#4f8fd1',
  B: '#8b8b8b',
  R: '#d3402a',
  G: '#3f9155',
}

/** Picks any subset of WUBRG — empty selection means colorless, same convention as Scryfall's own `colors: string[]`. */
export function ColorPicker({ selected, onChange }: { selected: Color[]; onChange: (colors: Color[]) => void }) {
  function toggle(c: Color) {
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c])
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => toggle(c)}
          className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition ${
            selected.includes(c) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/30" style={{ backgroundColor: COLOR_SWATCH[c] }} />
          {COLOR_LABELS[c]}
        </button>
      ))}
    </div>
  )
}
