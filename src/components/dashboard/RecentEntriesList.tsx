import Badge from '@/components/ui/Badge'
import type { FuelEntryRow, OtherCostRow } from '@/types'
import { formatCurrency, formatDate, formatLiters } from '@/lib/utils'

interface RecentEntriesListProps {
  fuelEntries: FuelEntryRow[]
  otherCosts: OtherCostRow[]
}

export default function RecentEntriesList({ fuelEntries, otherCosts }: RecentEntriesListProps) {
  type Item = { date: string; key: string; el: React.ReactNode }

  const items: Item[] = [
    ...fuelEntries.slice(0, 5).map((e) => ({
      date: e.date,
      key: `fuel-${e.id}`,
      el: (
        <div className="flex items-center gap-3 py-2.5 border-b border-slate-700/50 last:border-0">
          <Badge variant={e.fuel_type === 'lpg' ? 'lpg' : 'petrol'} className="shrink-0">
            {e.fuel_type.toUpperCase()}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white">{formatLiters(e.liters)}</p>
            <p className="text-xs text-slate-400">{formatDate(e.date)}</p>
          </div>
          <p className="text-sm font-semibold text-white shrink-0">{formatCurrency(e.total_cost)}</p>
        </div>
      ),
    })),
    ...otherCosts.slice(0, 3).map((c) => ({
      date: c.date,
      key: `cost-${c.id}`,
      el: (
        <div className="flex items-center gap-3 py-2.5 border-b border-slate-700/50 last:border-0">
          <Badge variant="neutral" className="shrink-0 capitalize">{c.category}</Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{c.description}</p>
            <p className="text-xs text-slate-400">{formatDate(c.date)}</p>
          </div>
          <p className="text-sm font-semibold text-white shrink-0">{formatCurrency(c.cost)}</p>
        </div>
      ),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  if (items.length === 0) {
    return <p className="text-center text-slate-500 text-sm py-6">No entries yet</p>
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">Recent</h2>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4">
        {items.map((i) => <div key={i.key}>{i.el}</div>)}
      </div>
    </div>
  )
}
