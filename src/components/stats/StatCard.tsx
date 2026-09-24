interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
  /** % change vs previous period. Positive = higher. Pass higherIsBetter=true if up is good (e.g. km driven). */
  delta?: number | null
  higherIsBetter?: boolean
}

export default function StatCard({ label, value, sub, icon, delta, higherIsBetter = false }: StatCardProps) {
  const isGood = delta != null ? (higherIsBetter ? delta >= 0 : delta <= 0) : null

  return (
    <div className="rounded-lg border border-line p-3 md:p-4 flex flex-col gap-1 min-w-0">
      <p className="text-xs text-ink-muted flex items-center gap-1.5 truncate">
        {icon && <span className="text-ink-faint shrink-0">{icon}</span>}
        {label}
      </p>
      <p className="text-xl md:text-2xl font-semibold text-ink leading-tight tabular-nums truncate">
        {value}
        {sub && <span className="text-xs font-normal text-ink-faint ml-1">{sub}</span>}
      </p>
      {delta != null && delta !== 0 && (
        <p className={`text-xs tabular-nums ${isGood ? 'text-[#448361]' : 'text-[#d44c47]'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}% <span className="text-ink-faint">vs last month</span>
        </p>
      )}
    </div>
  )
}
