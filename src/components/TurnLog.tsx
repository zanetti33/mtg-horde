import type { TurnLogEntry } from '../types'
import { CardThumbnail } from './CardThumbnail'

export function TurnLog({ lines, turnNumber }: { lines: TurnLogEntry[]; turnNumber: number }) {
  if (lines.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-300">Turno del bot #{turnNumber}</h3>
      <ol className="space-y-2">
        {lines.map((line, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-sm text-slate-500">{i + 1}.</span>
            {line.imageUrl && <CardThumbnail imageUrl={line.imageUrl} alt="" />}
            <span className="text-sm text-slate-200">{line.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
