// Thin inline proportion bar for table cells.
export default function ShareBar({ value, color = '#9b9a97' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-line-soft overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-ink-faint tabular-nums w-9 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}
