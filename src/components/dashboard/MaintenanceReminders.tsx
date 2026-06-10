import { Wrench, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
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
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide px-1">Service due</h2>

      {dueServices.map((s) => (
        <div
          key={s.serviceType}
          onClick={() => navigate('/service')}
          className="bg-white border border-amber-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          <Wrench size={18} className={s.status === 'overdue' ? 'text-red-500' : 'text-amber-500'} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{s.label}</p>
            <p className="text-xs text-gray-400">Next due @ {formatKm(s.nextDueKm)}</p>
          </div>
          <Badge variant={s.status === 'overdue' ? 'danger' : 'warning'} className="text-[10px] shrink-0">
            {s.kmRemaining <= 0 ? `${formatKm(Math.abs(s.kmRemaining))} overdue` : `${formatKm(s.kmRemaining)} left`}
          </Badge>
        </div>
      ))}

      {dueRenewals.map((r) => (
        <div
          key={r.id}
          onClick={() => navigate('/service')}
          className="bg-white border border-amber-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          <ShieldAlert size={18} className={r.status === 'overdue' ? 'text-red-500' : 'text-amber-500'} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
            <p className="text-xs text-gray-400">Valid until {formatDate(r.validUntil)}</p>
          </div>
          <Badge variant={r.status === 'overdue' ? 'danger' : 'warning'} className="text-[10px] shrink-0">
            {r.daysRemaining < 0 ? `${Math.abs(r.daysRemaining)}d overdue` : r.daysRemaining === 0 ? 'today' : `${r.daysRemaining}d left`}
          </Badge>
        </div>
      ))}
    </div>
  )
}
