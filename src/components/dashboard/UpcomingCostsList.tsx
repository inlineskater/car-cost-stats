import { Clock } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { OtherCostRow } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'

interface UpcomingCostsListProps {
  costs: OtherCostRow[]
}

export default function UpcomingCostsList({ costs }: UpcomingCostsListProps) {
  if (costs.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide px-1">Upcoming</h2>
      {costs.map((c) => {
        const days = differenceInDays(parseISO(c.next_due_date!), new Date())
        return (
          <div key={c.id} className="bg-white border border-amber-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
            <Clock size={18} className={days <= 7 ? 'text-red-500' : 'text-amber-500'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.description}</p>
              <p className="text-xs text-gray-400">{formatDate(c.next_due_date!)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(c.cost)}</p>
              <Badge variant={days <= 7 ? 'danger' : 'warning'} className="text-[10px]">
                {days <= 0 ? 'today' : `${days}d`}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
