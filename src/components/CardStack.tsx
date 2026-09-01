import type { ReactNode } from 'react'

/**
 * Wraps a single card tile (the `children`) with a "×N" count badge when it represents a group of
 * indistinguishable creatures/permanents (see `engine/battlefieldGrouping.ts`) rather than just one.
 * Interactions (click/right-click/hover) all stay on the front tile, untouched by this wrapper.
 */
export function CardStack({ count, testId, children }: { count: number; testId?: string; children: ReactNode }) {
  return (
    <div className="relative" data-testid={testId}>
      {children}
      {count > 1 && (
        <span className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-100 ring-2 ring-slate-950">
          ×{count}
        </span>
      )}
    </div>
  )
}
