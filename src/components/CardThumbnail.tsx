/** A small card image that pops up a much larger preview on hover, anchored to the right of the thumbnail. */
export function CardThumbnail({ imageUrl, alt, className }: { imageUrl: string; alt: string; className?: string }) {
  return (
    <div className="group/thumb relative shrink-0">
      <img src={imageUrl} alt={alt} className={className ?? 'h-14 w-auto rounded'} />
      <img
        src={imageUrl}
        alt=""
        className="pointer-events-none absolute left-full top-1/2 z-40 ml-3 hidden w-56 max-w-none -translate-y-1/2 rounded-lg shadow-2xl ring-1 ring-slate-700 group-hover/thumb:block"
      />
    </div>
  )
}
