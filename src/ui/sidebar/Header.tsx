// src/ui/sidebar/Header.tsx — Crafted brand lockup with geometric mark
export function Header() {
  return (
    <div className="sb-section flex items-center gap-3 py-1">
      {/* Geometric grid mark */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* 3×3 grid of dots with varying weights — a quiet raster motif */}
        {[0, 8, 16].flatMap(y =>
          [0, 8, 16].map(x => (
            <rect
              key={`${x}-${y}`}
              x={x + 2}
              y={y + 2}
              width={x === 8 && y === 8 ? 4 : 2}
              height={x === 8 && y === 8 ? 4 : 2}
              rx="0.5"
              fill={x === 8 && y === 8 ? '#171717' : '#d4d4d4'}
            />
          ))
        )}
      </svg>

      <div>
        <div
          className="text-[15px] font-semibold tracking-[-0.02em] text-neutral-900 leading-none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          Raster
        </div>
        <div className="mt-0.5 text-[10px] font-medium tracking-[0.06em] text-neutral-400 uppercase leading-none">
          Design · Layout · Type
        </div>
      </div>
    </div>
  )
}
