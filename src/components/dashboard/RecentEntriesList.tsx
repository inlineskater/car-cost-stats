import { useNavigate } from 'react-router-dom'
import { History as HistoryIcon, ArrowRight } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Section from '@/components/ui/Section'
import type { FuelEntryRow, OtherCostRow } from '@/types'
import { formatCurrency, formatDate, formatLiters } from '@/lib/utils'

interface RecentEntriesListProps {
  fuelEntries: FuelEntryRow[]
  otherCosts: OtherCostRow[]
}

export default function RecentEntriesList({ fuelEntries, otherCosts }: RecentEntriesListProps) {
  const navigate = useNavigate()

  const items = [
    ...fuelEntries.map((e) => ({
      key: `fuel-${e.id}`,
      date: e.date,
      tag: <Badge variant={e.fuel_type === 'lpg' ? 'lpg' : 'petrol'}>{e.fuel_type.toUpperCase()}</Badge>,
      detail: `${formatLiters(Number(e.liters))} · ${Number(e.mileage).toLocaleString('pl-PL')} km`,
      amount: Number(e.total_cost),
    })),
    ...otherCosts.map((c) => ({
      key: `cost-${c.id}`,
      date: c.date,
      tag: <Badge variant="neutral" className="capitalize">{c.category}</Badge>,
      detail: c.description,
      amount: Number(c.cost),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  if (items.length === 0) return null

  return (
    <Section
      title="Recent entries"
      icon={<HistoryIcon size={16} />}
      aside={
        <button onClick={() => navigate('/history')} className="n-chip">
          View all <ArrowRight size={13} />
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="n-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Details</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.key}>
                <td className="whitespace-nowrap text-ink-muted">{formatDate(i.date)}</td>
                <td>{i.tag}</td>
                <td className="max-w-[260px] truncate">{i.detail}</td>
                <td className="num">{formatCurrency(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
