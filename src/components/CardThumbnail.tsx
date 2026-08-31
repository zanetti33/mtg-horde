import { useRef, useState } from 'react'

const PREVIEW_WIDTH = 224 // w-56
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.4 // MTG card aspect ratio, approximated

/**
 * A small card image that pops up a much larger preview on hover. Position is computed from the
 * thumbnail's bounding rect and rendered `fixed` (not CSS-only `absolute`) so the preview can
 * escape any `overflow-hidden` ancestor — several call sites clip their card grid for rounded
 * corners — and is clamped to stay on-screen near viewport edges.
 */
export function CardThumbnail({ imageUrl, alt, className }: { imageUrl: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<{ left: number; top: number } | null>(null)

  function show() {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    let left = rect.right + 12
    if (left + PREVIEW_WIDTH > window.innerWidth) left = rect.left - PREVIEW_WIDTH - 12
    left = Math.max(8, left)
    const top = Math.min(Math.max(rect.top + rect.height / 2, 8 + PREVIEW_HEIGHT / 2), window.innerHeight - 8 - PREVIEW_HEIGHT / 2)
    setPreview({ left, top })
  }

  return (
    <div ref={ref} className="relative shrink-0" onMouseEnter={show} onMouseLeave={() => setPreview(null)}>
      <img src={imageUrl} alt={alt} className={className ?? 'h-14 w-auto rounded'} />
      {preview && (
        <img
          src={imageUrl}
          alt=""
          style={{ position: 'fixed', left: preview.left, top: preview.top, width: PREVIEW_WIDTH, transform: 'translateY(-50%)' }}
          className="pointer-events-none z-40 max-w-none rounded-lg shadow-2xl ring-1 ring-slate-700"
        />
      )}
    </div>
  )
}
