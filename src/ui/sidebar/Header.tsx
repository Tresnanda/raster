// src/ui/sidebar/Header.tsx — Neo-brutalist brand masthead
export function Header() {
  return (
    <div className="sb-section flex items-center justify-between py-1">
      {/* Logotype */}
      <div className="flex flex-col gap-1">
        <div
          className="font-sans text-[18px] font-black tracking-[-0.04em] text-foreground leading-none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          Raster
        </div>
        <div className="font-sans text-[10px] font-medium tracking-[0.06em] text-muted-foreground leading-none">
          Design · Layout · Type
        </div>
      </div>

      {/* Geometric dot-grid mark */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="shrink-0 opacity-60"
      >
        {[0, 7, 14].flatMap(y =>
          [0, 7, 14].map(x => (
            <rect
              key={`${x}-${y}`}
              x={x + 1}
              y={y + 1}
              width={x === 7 && y === 7 ? 4 : 2}
              height={x === 7 && y === 7 ? 4 : 2}
              rx="0.5"
              fill={x === 7 && y === 7 ? '#18181B' : '#71717A'}
            />
          ))
        )}
      </svg>
    </div>
  )
}
