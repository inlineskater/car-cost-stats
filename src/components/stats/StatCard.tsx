import Card from '@/components/ui/Card'

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
  const isGood = delta !== null && delta !== undefined
    ? (higherIsBetter ? delta >= 0 : delta <= 0)
    : null

  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {(sub || (delta != null)) && (
        <div className="flex items-center justify-between gap-1">
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
          {delta != null && (
            <p className={`text-xs font-semibold ml-auto ${isGood ? 'text-green-500' : 'text-red-500'}`}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}%
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
