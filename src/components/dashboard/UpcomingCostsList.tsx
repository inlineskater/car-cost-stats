import { CalendarClock } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import Badge from '@/components/ui/Badge'
import Section from '@/components/ui/Section'
import DateCell from '@/components/ui/DateCell'
import type { OtherCostRow } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface UpcomingCostsListProps {
  costs: OtherCostRow[]
}

export default function UpcomingCostsList({ costs }: UpcomingCostsListProps) {
  if (costs.length === 0) return null

  return (
    <Section title="Upcoming" icon={<CalendarClock size={16} />} aside={<span>next 30 days</span>}>
      <div className="overflow-x-auto">
        <table className="n-table">
          <thead>
            <tr><th>Item</th><th>Due</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {costs.map((c) => {
              const days = differenceInCalendarDays(parseISO(c.next_due_date!), new Date())
              return (
                <tr key={c.id}>
                  <td className="grow-cell">{c.description}</td>
                  <td className="whitespace-nowrap">
                    <span className="text-ink-muted mr-2 hidden sm:inline"><DateCell date={c.next_due_date!} /></span>
                    <Badge variant={days <= 7 ? 'danger' : 'warning'}>{days <= 0 ? 'today' : `in ${days}d`}</Badge>
                  </td>
                  <td className="num">{formatCurrency(c.cost)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
