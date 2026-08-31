import { useEffect, useRef } from 'react'

export interface ContextMenuOption {
  label: string
  onSelect: () => void
}

export function CardContextMenu({ x, y, options, onClose }: { x: number; y: number; options: ContextMenuOption[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const left = Math.min(x, window.innerWidth - 220)
  const top = Math.min(y, window.innerHeight - options.length * 36 - 16)

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top }}
      className="z-30 min-w-[200px] overflow-hidden rounded border border-slate-700 bg-slate-900 py-1 shadow-xl"
    >
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={() => {
            opt.onSelect()
            onClose()
          }}
          className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
