interface ChartRangeFilterProps {
  value: string
  onChange: (value: string) => void
  years: string[]   // e.g. ['2026', '2025', '2024'], newest first
}

export const DEFAULT_RANGE = '12m'

export default function ChartRangeFilter({ value, onChange, years }: ChartRangeFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm pl-2 pr-1 py-1 rounded-md bg-transparent text-ink-muted hover:bg-surface-hover focus:outline-none transition-colors cursor-pointer"
    >
      <option value="12m">Last 12 months</option>
      <option value="24m">Last 24 months</option>
      {years.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
      <option value="all">All time</option>
    </select>
  )
}
