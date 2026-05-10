import { format, subMonths } from 'date-fns'
import { Download, Trash2 } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
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
  { value: 'other', label: 'Other' },
]

function monthOptions() {
  const opts = []
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i)
    opts.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') })
  }
  return opts
}

type Row =
  | { type: 'fuel'; date: string; id: string; data: FuelEntryRow }
  | { type: 'cost'; date: string; id: string; data: OtherCostRow }

export default function History() {
  const { historyFilters, setHistoryFilters } = useAppStore()
  const addToast = useAppStore((s) => s.addToast)

  const showFuel = historyFilters.fuelType !== 'other'
  const showOther = historyFilters.fuelType === 'all' || historyFilters.fuelType === 'other'

  const fuelTypeFilter = historyFilters.fuelType === 'other' ? 'all' : (historyFilters.fuelType as FuelType | 'all')
  const { data: fuelEntries = [], isLoading: fl } = useFuelEntries(
    showFuel ? { fuelType: fuelTypeFilter, month: historyFilters.month } : undefined,
  )
  const { data: otherCosts = [], isLoading: cl } = useOtherCosts(historyFilters.month)

  const { data: allFuelEntries = [] } = useAllFuelEntries()
  const { data: allOtherCosts = [] } = useAllOtherCosts()

  const deleteFuel = useDeleteFuelEntry()
  const deleteCost = useDeleteOtherCost()

  async function handleDeleteFuel(id: string) {
    await deleteFuel.mutateAsync(id)
    addToast('Entry deleted.', 'success')
  }
  async function handleDeleteCost(id: string) {
    await deleteCost.mutateAsync(id)
    addToast('Cost deleted.', 'success')
  }

  const rows: Row[] = [
    ...(showFuel ? fuelEntries.map((e) => ({ type: 'fuel' as const, date: e.date, id: e.id, data: e })) : []),
    ...(showOther ? otherCosts.map((c) => ({ type: 'cost' as const, date: c.date, id: c.id, data: c })) : []),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const months = monthOptions()

  return (
    <div>
      <TopBar
        title="History"
        action={
          <button
            onClick={() => exportCsv(allFuelEntries, allOtherCosts)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Download size={18} />
          </button>
        }
      />

      <div className="sticky top-14 z-20 bg-[#F2F2F7] border-b border-gray-200 px-4 py-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FUEL_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setHistoryFilters({ fuelType: tab.value })}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                historyFilters.fuelType === tab.value
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white text-gray-500 hover:text-gray-700 shadow-sm',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={historyFilters.month ?? ''}
          onChange={(e) => setHistoryFilters({ month: e.target.value || null })}
          className="bg-white border-0 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none shadow-sm"
        >
          <option value="">All months</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="p-4">
        {(fl || cl) && rows.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No entries for this filter.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Details</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2.5">
                      {row.type === 'fuel' ? (
                        <Badge variant={row.data.fuel_type === 'lpg' ? 'lpg' : 'petrol'}>
                          {row.data.fuel_type.toUpperCase()}
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="capitalize">{row.data.category}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 truncate max-w-[140px]">
                      {row.type === 'fuel'
                        ? `${row.data.liters.toFixed(2)} L · ${row.data.mileage.toLocaleString()} km`
                        : row.data.description}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(row.type === 'fuel' ? row.data.total_cost : row.data.cost)}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => row.type === 'fuel' ? handleDeleteFuel(row.id) : handleDeleteCost(row.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
