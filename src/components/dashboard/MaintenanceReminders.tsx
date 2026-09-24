import { Wrench, ShieldAlert, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import Section from '@/components/ui/Section'
import { useMaintenanceStatus, useRenewalStatus } from '@/hooks/useMaintenance'
import { formatKm, formatDate } from '@/lib/utils'

export default function MaintenanceReminders() {
  const navigate = useNavigate()
  const { data: services } = useMaintenanceStatus()
  const { data: renewals } = useRenewalStatus()

  const dueServices = services.filter((s) => s.status !== 'ok')
  const dueRenewals = renewals.filter((r) => r.status !== 'ok')

  if (dueServices.length === 0 && dueRenewals.length === 0) return null

  return (
    <Section title="Needs attention" icon={<AlertTriangle size={16} />}>
      <div className="rounded-lg bg-[#fbf3db]/60 border border-[#f3e3b5] divide-y divide-[#f3e3b5]">
        {dueServices.map((s) => (
          <button
            key={s.serviceType}
            onClick={() => navigate('/service')}
            className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-[#fbf3db] transition-colors"
          >
            <Wrench size={16} className="text-ink-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate">{s.label}</p>
              <p className="text-xs text-ink-muted">Next due @ {formatKm(s.nextDueKm)}</p>
            </div>
            <Badge variant={s.status === 'overdue' ? 'danger' : 'warning'}>
              {s.kmRemaining <= 0 ? `${formatKm(Math.abs(s.kmRemaining))} overdue` : `${formatKm(s.kmRemaining)} left`}
            </Badge>
          </button>
        ))}
        {dueRenewals.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate('/service')}
            className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-[#fbf3db] transition-colors"
          >
            <ShieldAlert size={16} className="text-ink-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate">{r.label}</p>
              <p className="text-xs text-ink-muted">Valid until {formatDate(r.validUntil)}</p>
            </div>
            <Badge variant={r.status === 'overdue' ? 'danger' : 'warning'}>
              {r.daysRemaining < 0 ? `${Math.abs(r.daysRemaining)}d overdue` : r.daysRemaining === 0 ? 'today' : `${r.daysRemaining}d left`}
            </Badge>
          </button>
        ))}
      </div>
    </Section>
  )
}
