import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Wrench, ShieldCheck } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import {
  useMaintenanceStatus,
  useRenewalStatus,
  useAllMaintenanceRecords,
  useDeleteMaintenanceRecord,
} from '@/hooks/useMaintenance'
import { serviceTypeLabel } from '@/lib/maintenance'
import { useAppStore } from '@/stores/appStore'
import { formatCurrency, formatDate, formatKm } from '@/lib/utils'
import type { ReminderStatus } from '@/types'

const STATUS_BADGE: Record<ReminderStatus, 'danger' | 'warning' | 'success'> = {
  overdue: 'danger',
  due_soon: 'warning',
  ok: 'success',
}
const BAR_COLOR: Record<ReminderStatus, string> = {
  overdue: 'bg-red-500',
  due_soon: 'bg-amber-500',
  ok: 'bg-emerald-500',
}

export default function Maintenance() {
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)
  const { data: services, currentOdometer, isLoading: sl } = useMaintenanceStatus()
  const { data: renewals, isLoading: rl } = useRenewalStatus()
  const { data: records = [] } = useAllMaintenanceRecords()
  const deleteRecord = useDeleteMaintenanceRecord()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const isLoading = sl || rl

  return (
    <div>
      <TopBar
        title="Service & Renewals"
        action={
          <button
            onClick={() => navigate('/add-service')}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add
          </button>
        }
      />

      <div className="p-4 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <>
            {/* Renewals (date-based) */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide px-1 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Renewals
              </h2>
              {renewals.length === 0 ? (
                <Card>
                  <p className="text-sm text-gray-400">
                    No renewals yet. Add OC or przegląd dates with the{' '}
                    <button onClick={() => navigate('/add-service?type=renewal')} className="text-blue-500 font-medium">Add</button>{' '}
                    button.
                  </p>
                </Card>
              ) : (
                renewals.map((r) => (
                  <Card key={r.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                      <p className="text-xs text-gray-400">Valid until {formatDate(r.validUntil)}</p>
                    </div>
                    <Badge variant={STATUS_BADGE[r.status]}>
                      {r.daysRemaining < 0
                        ? `${Math.abs(r.daysRemaining)}d overdue`
                        : r.daysRemaining === 0
                          ? 'today'
                          : `${r.daysRemaining}d left`}
                    </Badge>
                  </Card>
                ))
              )}
            </section>

            {/* Services (km-based) */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide px-1 flex items-center gap-1.5">
                <Wrench size={14} /> Services
                {currentOdometer > 0 && (
                  <span className="ml-auto normal-case font-normal text-gray-400">at {formatKm(currentOdometer)}</span>
                )}
              </h2>
              {services.length === 0 ? (
                <Card>
                  <p className="text-sm text-gray-400">No services tracked yet. Add LPG service or oil change with the Add button.</p>
                </Card>
              ) : (
                services.map((s) => {
                  const driven = Math.max(0, currentOdometer - s.lastOdometer)
                  const pct = Math.min(100, Math.round((driven / s.intervalKm) * 100))
                  return (
                    <Card key={s.serviceType} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.label}</p>
                          <p className="text-xs text-gray-400">
                            Last @ {formatKm(s.lastOdometer)} · {formatDate(s.lastDate)}
                          </p>
                        </div>
                        <Badge variant={STATUS_BADGE[s.status]}>
                          {s.kmRemaining <= 0
                            ? `${formatKm(Math.abs(s.kmRemaining))} overdue`
                            : `${formatKm(s.kmRemaining)} left`}
                        </Badge>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${BAR_COLOR[s.status]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400">
                        Next due @ {formatKm(s.nextDueKm)} (every {formatKm(s.intervalKm)})
                      </p>
                    </Card>
                  )
                })
              )}
            </section>

            {/* Service history */}
            {records.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide px-1">Service history</h2>
                <div className="bg-white rounded-2xl shadow-sm">
                  {records.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="neutral">{serviceTypeLabel(r.service_type)}</Badge>
                          <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">
                          {formatKm(r.odometer_km)} · every {formatKm(r.interval_km)}
                        </p>
                      </div>
                      {r.cost != null && (
                        <p className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(r.cost)}</p>
                      )}
                      <button
                        onClick={() => setPendingDelete(r.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete service record?">
        <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={async () => {
            if (pendingDelete) {
              await deleteRecord.mutateAsync(pendingDelete)
              addToast('Record deleted.', 'success')
            }
            setPendingDelete(null)
          }}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
