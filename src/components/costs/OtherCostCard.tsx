import { Trash2, Clock } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { OtherCostRow } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { differenceInCalendarDays, parseISO } from 'date-fns'

const CATEGORY_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  insurance: 'Insurance',
  service: 'Service',
  repair: 'Repair',
  tax: 'Road tax',
  other: 'Other',
}

interface OtherCostCardProps {
  cost: OtherCostRow
  onDelete?: (id: string) => void
}

export default function OtherCostCard({ cost, onDelete }: OtherCostCardProps) {
  const daysUntilDue = cost.next_due_date
    ? differenceInCalendarDays(parseISO(cost.next_due_date), new Date())
    : null

  const dueBadgeVariant = daysUntilDue === null
    ? undefined
    : daysUntilDue <= 7
      ? 'danger'
      : daysUntilDue <= 30
        ? 'warning'
        : 'neutral'

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="neutral">{CATEGORY_LABELS[cost.category]}</Badge>
            {daysUntilDue !== null && (
              <Badge variant={dueBadgeVariant}>
                <Clock size={10} className="mr-1" />
                Due {daysUntilDue <= 0 ? 'today' : `in ${daysUntilDue}d`}
              </Badge>
            )}
            <span className="text-xs text-ink-faint ml-auto">{formatDate(cost.date)}</span>
          </div>
          <p className="text-xl font-bold text-ink">{formatCurrency(cost.cost)}</p>
          <p className="text-sm text-ink-muted mt-0.5 truncate">{cost.description}</p>
          {cost.next_due_date && (
            <p className="text-xs text-ink-faint mt-0.5">Next due: {formatDate(cost.next_due_date)}</p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(cost.id)}
            className="text-ink-faint hover:text-[#d44c47] transition-colors p-1 shrink-0"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
