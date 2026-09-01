import type { ReactNode } from 'react'

/**
 * Wraps a single card tile (the `children`) with the visual illusion of a small pile of identical
 * cards behind it — 1-2 offset "backing" shapes peeking out bottom-right, capped regardless of how
 * big the stack really is (a 13-token stack still only shows 2 backing layers; the count badge is
 * what carries the real number). Purely decorative: interactions (click/right-click/hover) all stay
 * on the front tile, which is rendered completely untouched by this wrapper.
 */
export function CardStack({
  count,
  borderClassName = 'border-slate-800',
  testId,
  children,
}: {
  count: number
  borderClassName?: string
  testId?: string
  children: ReactNode
}) {
  const backingLayers = Math.min(Math.max(count - 1, 0), 2)

  return (
    <div className="relative" data-testid={testId}>
      {Array.from({ length: backingLayers }, (_, i) => {
        // A slight same-direction rotation (like a pile of cards nudged to one side) reads much
        // more clearly as "a pile" than a straight parallel offset, which only peeks out by a
        // couple of flat pixels on one corner. Kept small on purpose: these tiles are wide and
        // short (board grid cells), so even a few degrees of rotation swings the long edge into a
        // lot of *vertical* overflow — big enough angles here would bleed into the grid row above
        // or below, not just sideways into `gap-2`.
        const angle = (i + 1) * 2.5
        return (
          <div
            key={i}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded border bg-slate-700 shadow-md shadow-black/50 ${borderClassName}`}
            style={{ transform: `rotate(${angle}deg)` }}
          />
        )
      })}
      {children}
      {count > 1 && (
        <span className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-100 ring-2 ring-slate-950">
          ×{count}
        </span>
      )}
    </div>
  )
}
