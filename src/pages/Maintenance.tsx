import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Wrench, ShieldCheck, History as HistoryIcon } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import Section from '@/components/ui/Section'
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
  overdue: 'bg-[#d44c47]',
  due_soon: 'bg-[#cb912f]',
  ok: 'bg-[#448361]',
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

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteRecord.mutateAsync(pendingDelete)
      addToast('Record deleted.', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not delete record.', 'error')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div>
      <TopBar
        title="Service & Renewals"
        description="Km-based services and date-based renewals."
        action={
          <Button size="sm" onClick={() => navigate('/add-service')} className="flex items-center gap-1">
            <Plus size={15} /> New
          </Button>
        }
      />

      <div className="px-4 md:px-12 pb-8 max-w-5xl mx-auto space-y-10">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <>
            <Section title="Renewals" icon={<ShieldCheck size={16} />}>
              {renewals.length === 0 ? (
                <p className="text-sm text-ink-faint border border-dashed border-line rounded-lg p-4">
                  No renewals yet. Add OC or przegląd dates with{' '}
                  <button onClick={() => navigate('/add-service?type=renewal')} className="text-accent hover:underline">New</button>.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="n-table">
                    <thead>
                      <tr><th>Renewal</th><th>Valid until</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {renewals.map((r) => (
                        <tr key={r.id}>
                          <td>{r.label}</td>
                          <td className="text-ink-muted whitespace-nowrap">{formatDate(r.validUntil)}</td>
                          <td>
                            <Badge variant={STATUS_BADGE[r.status]}>
                              {r.daysRemaining < 0
                                ? `${Math.abs(r.daysRemaining)}d overdue`
                                : r.daysRemaining === 0
                                  ? 'today'
                                  : `${r.daysRemaining}d left`}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section
              title="Services"
              icon={<Wrench size={16} />}
              aside={currentOdometer > 0 ? <span>Odometer {formatKm(currentOdometer)}</span> : undefined}
            >
              {services.length === 0 ? (
                <p className="text-sm text-ink-faint border border-dashed border-line rounded-lg p-4">
                  No services tracked yet. Add an LPG service or oil change with New.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="n-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th className="hidden sm:table-cell">Last done</th>
                        <th>Progress</th>
                        <th className="num">Next due</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => {
                        const driven = Math.max(0, currentOdometer - s.lastOdometer)
                        const pct = Math.min(100, Math.round((driven / s.intervalKm) * 100))
                        return (
                          <tr key={s.serviceType}>
                            <td className="whitespace-nowrap">{s.label}</td>
                            <td className="text-ink-muted whitespace-nowrap hidden sm:table-cell">
                              {formatKm(s.lastOdometer)} · {formatDate(s.lastDate)}
                            </td>
                            <td>
                              <div className="flex items-center gap-2 min-w-[90px]">
                                <div className="flex-1 bg-line-soft rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full rounded-full ${BAR_COLOR[s.status]}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-ink-faint tabular-nums w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                            <td className="num text-ink-muted" title={`every ${formatKm(s.intervalKm)}`}>{formatKm(s.nextDueKm)}</td>
                            <td>
                              <Badge variant={STATUS_BADGE[s.status]}>
                                {s.kmRemaining <= 0
                                  ? `${formatKm(Math.abs(s.kmRemaining))} overdue`
                                  : `${formatKm(s.kmRemaining)} left`}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {records.length > 0 && (
              <Section title="Service history" icon={<HistoryIcon size={16} />}>
                <div className="overflow-x-auto">
                  <table className="n-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Service</th>
                        <th className="num">Odometer</th>
                        <th className="num hidden sm:table-cell">Interval</th>
                        <th className="num">Cost</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id} className="group">
                          <td className="text-ink-muted whitespace-nowrap">{formatDate(r.date)}</td>
                          <td><Badge variant="purple">{serviceTypeLabel(r.service_type)}</Badge></td>
                          <td className="num">{formatKm(r.odometer_km)}</td>
                          <td className="num text-ink-muted hidden sm:table-cell">{formatKm(r.interval_km)}</td>
                          <td className="num">{r.cost != null ? formatCurrency(r.cost) : <span className="text-ink-faint">—</span>}</td>
                          <td className="!px-1">
                            <button
                              onClick={() => setPendingDelete(r.id)}
                              className="p-1 rounded text-ink-faint hover:text-[#d44c47] hover:bg-surface-hover transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                              aria-label="Delete record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}
          </>
        )}
      </div>

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete service record?">
        <p className="text-sm text-ink-muted mb-4">This action cannot be undone.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" disabled={deleteRecord.isPending} onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
