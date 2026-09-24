import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Download, Trash2 } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useFuelEntries, useDeleteFuelEntry, useAllFuelEntries } from '@/hooks/useFuelEntries'
import { useOtherCosts, useDeleteOtherCost, useAllOtherCosts } from '@/hooks/useOtherCosts'
import { useAppStore } from '@/stores/appStore'
import type { HistoryFilters, FuelType } from '@/types'
import type { FuelEntryRow, OtherCostRow } from '@/types/database'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { exportCsv } from '@/lib/exportCsv'

const FUEL_TABS: { value: HistoryFilters['fuelType']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'lpg', label: 'LPG' },
  { value: 'petrol', label: 'Petrol' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
]

// every month that has at least one entry, newest first
function monthOptions(dates: string[]) {
  return [...new Set(dates.map((d) => d.substring(0, 7)))]
    .sort()
    .reverse()
    .map((m) => ({ value: m, label: format(parseISO(`${m}-01`), 'MMM yyyy') }))
}

const CATEGORY_BADGE: Record<string, 'purple' | 'info' | 'yellow' | 'warning' | 'neutral'> = {
  service: 'purple',
  repair: 'purple',
  insurance: 'info',
  inspection: 'yellow',
  tax: 'warning',
}

type Row =
  | { type: 'fuel'; date: string; id: string; data: FuelEntryRow }
  | { type: 'cost'; date: string; id: string; data: OtherCostRow }

export default function History() {
  const { historyFilters, setHistoryFilters } = useAppStore()
  const addToast = useAppStore((s) => s.addToast)
  const [pendingDelete, setPendingDelete] = useState<{ type: 'fuel' | 'cost'; id: string } | null>(null)

  const showFuel = historyFilters.fuelType !== 'other' && historyFilters.fuelType !== 'service'
  const showOther = historyFilters.fuelType === 'all' || historyFilters.fuelType === 'other' || historyFilters.fuelType === 'service'

  const fuelTypeFilter = historyFilters.fuelType === 'other' ? 'all' : (historyFilters.fuelType as FuelType | 'all')
  const { data: fuelEntries = [], isLoading: fl } = useFuelEntries(
    showFuel ? { fuelType: fuelTypeFilter, month: historyFilters.month } : undefined,
  )
  const { data: otherCosts = [], isLoading: cl } = useOtherCosts(historyFilters.month)

  const { data: allFuelEntries = [] } = useAllFuelEntries()
  const { data: allOtherCosts = [] } = useAllOtherCosts()

  const deleteFuel = useDeleteFuelEntry()
  const deleteCost = useDeleteOtherCost()

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      if (pendingDelete.type === 'fuel') await deleteFuel.mutateAsync(pendingDelete.id)
      else await deleteCost.mutateAsync(pendingDelete.id)
      addToast('Entry deleted.', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not delete entry.', 'error')
    } finally {
      setPendingDelete(null)
    }
  }

  const filteredOtherCosts = historyFilters.fuelType === 'service'
    ? otherCosts.filter((c) => c.category === 'service' || c.category === 'repair')
    : otherCosts

  const rows: Row[] = [
    ...(showFuel ? fuelEntries.map((e) => ({ type: 'fuel' as const, date: e.date, id: e.id, data: e })) : []),
    ...(showOther ? filteredOtherCosts.map((c) => ({ type: 'cost' as const, date: c.date, id: c.id, data: c })) : []),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const months = monthOptions([...allFuelEntries.map((e) => e.date), ...allOtherCosts.map((c) => c.date)])
  const rowsTotal = rows.reduce((sum, r) => sum + Number(r.type === 'fuel' ? r.data.total_cost : r.data.cost), 0)

  return (
    <div>
      <TopBar
        title="History"
        description="Every fill-up and cost, in one table."
        action={
          <button
            onClick={() => exportCsv(allFuelEntries, allOtherCosts)}
            className="n-chip"
            title="Export CSV"
          >
            <Download size={15} /> <span className="hidden sm:inline">Export</span>
          </button>
        }
      />

      <div className="px-4 md:px-12 pb-8 max-w-5xl mx-auto">
        {/* view tabs + filter, Notion database style */}
        <div className="sticky top-11 z-20 bg-white/95 backdrop-blur border-b border-line flex items-center gap-1 -mx-2 px-2">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar flex-1">
            {FUEL_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setHistoryFilters({ fuelType: tab.value })}
                className={cn(
                  'shrink-0 px-2 py-2 text-sm transition-colors border-b-2 -mb-px',
                  historyFilters.fuelType === tab.value
                    ? 'border-ink text-ink font-medium'
                    : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={historyFilters.month ?? ''}
            onChange={(e) => setHistoryFilters({ month: e.target.value || null })}
            className="shrink-0 text-sm bg-transparent text-ink-muted rounded-md px-1.5 py-1 hover:bg-surface-hover focus:outline-none cursor-pointer"
          >
            <option value="">All months</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {(fl || cl) && rows.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-ink-faint py-12">No entries for this filter.</p>
        ) : (
          <div className="overflow-x-auto mt-1">
            <table className="n-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th className="num hidden sm:table-cell">Odometer</th>
                  <th className="num">Amount</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="group">
                    <td className="whitespace-nowrap text-ink-muted">{formatDate(row.date)}</td>
                    <td>
                      {row.type === 'fuel' ? (
                        <Badge variant={row.data.fuel_type === 'lpg' ? 'lpg' : 'petrol'}>
                          {row.data.fuel_type.toUpperCase()}
                        </Badge>
                      ) : (
                        <Badge variant={CATEGORY_BADGE[row.data.category] ?? 'neutral'} className="capitalize">{row.data.category}</Badge>
                      )}
                    </td>
                    <td className="max-w-[240px] truncate">
                      {row.type === 'fuel'
                        ? <>{Number(row.data.liters).toFixed(2)} L <span className="text-ink-faint">· {Number(row.data.price_per_liter).toFixed(2)} zł/L</span></>
                        : row.data.description}
                    </td>
                    <td className="num text-ink-muted hidden sm:table-cell">
                      {row.type === 'fuel' ? Number(row.data.mileage).toLocaleString('pl-PL') : ''}
                    </td>
                    <td className="num">
                      {formatCurrency(Number(row.type === 'fuel' ? row.data.total_cost : row.data.cost))}
                    </td>
                    <td className="!px-1">
                      <button
                        onClick={() => setPendingDelete({ type: row.type, id: row.id })}
                        className="p-1 rounded text-ink-faint hover:text-[#d44c47] hover:bg-surface-hover transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                        aria-label="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-2 py-2 text-xs text-ink-muted">{rows.length} entries</td>
                  <td className="hidden sm:table-cell" />
                  <td className="px-2 py-2 num font-semibold">{formatCurrency(rowsTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete entry?">
        <p className="text-sm text-ink-muted mb-4">This action cannot be undone.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" disabled={deleteFuel.isPending || deleteCost.isPending} onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
