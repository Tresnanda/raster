// src/ui/sidebar/Header.tsx — Ink Brutalism brand masthead
export function Header() {
  return (
    <div className="sb-section flex flex-col gap-3 py-1">
      {/* Top hairline rule */}
      <div className="h-[2px] w-full bg-foreground" />

      {/* Brand lockup row */}
      <div className="flex items-start justify-between">
        {/* Logotype block */}
        <div className="flex flex-col gap-0.5">
          <div
            className="font-sans text-[20px] font-black uppercase tracking-[-0.04em] text-foreground leading-none"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            RASTER
            <sup className="text-[10px] font-mono font-bold align-super ml-0.5 tracking-normal text-accent">
              ®
            </sup>
          </div>
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground leading-none">
            Design · Layout · Type
          </div>
        </div>

        {/* REV mark + grid motif */}
        <div className="flex flex-col items-end gap-1">
          {/* Raster dot-grid mark */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            {[0, 7, 14].flatMap(y =>
              [0, 7, 14].map(x => (
                <rect
                  key={`${x}-${y}`}
                  x={x + 1}
                  y={y + 1}
                  width={x === 7 && y === 7 ? 4 : 2}
                  height={x === 7 && y === 7 ? 4 : 2}
                  rx="0"
                  fill={x === 7 && y === 7 ? '#0A0A0A' : '#6B6B66'}
                />
              ))
            )}
          </svg>
          <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 leading-none">
            REV 1.0
          </div>
        </div>
      </div>

      {/* Bottom hairline rule */}
      <div className="h-[2px] w-full bg-foreground" />
    </div>
  )
}
