import { COLOR_SWATCH } from './ColorPicker'
import type { Color } from '../types'

function isColor(c: string): c is Color {
  return c in COLOR_SWATCH
}

/** Small read-only color pips for a creature's `colors` (see Color in types.ts) — the display-only counterpart to ColorPicker's editable version. */
export function ColorDots({ colors }: { colors?: string[] }) {
  if (!colors || colors.length === 0) return null
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {colors.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="h-2 w-2 rounded-full ring-1 ring-black/30"
          style={{ backgroundColor: isColor(c) ? COLOR_SWATCH[c] : '#9ca3af' }}
        />
      ))}
    </span>
  )
}
