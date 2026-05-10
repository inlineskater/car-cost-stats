import { format, subMonths } from 'date-fns'
import TopBar from '@/components/layout/TopBar'
import FuelEntryCard from '@/components/fuel/FuelEntryCard'
import OtherCostCard from '@/components/costs/OtherCostCard'
import Spinner from '@/components/ui/Spinner'
import { useFuelEntries, useDeleteFuelEntry } from '@/hooks/useFuelEntries'
import { useOtherCosts, useDeleteOtherCost } from '@/hooks/useOtherCosts'
import { useAppStore } from '@/stores/appStore'
import type { HistoryFilters, FuelType } from '@/types'
import { cn } from '@/lib/utils'

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

  type CombinedItem =
    | { type: 'fuel'; date: string; id: string; el: React.ReactNode }
    | { type: 'cost'; date: string; id: string; el: React.ReactNode }

  const items: CombinedItem[] = [
    ...(showFuel ? fuelEntries.map((e) => ({
      type: 'fuel' as const,
      date: e.date,
      id: e.id,
      el: <FuelEntryCard key={e.id} entry={e} onDelete={handleDeleteFuel} />,
    })) : []),
    ...(showOther ? otherCosts.map((c) => ({
      type: 'cost' as const,
      date: c.date,
      id: c.id,
      el: <OtherCostCard key={c.id} cost={c} onDelete={handleDeleteCost} />,
    })) : []),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const months = monthOptions()

  return (
    <div>
      <TopBar title="History" />

      {/* Filters */}
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

      <div className="p-4 space-y-3">
        {(fl || cl) && items.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No entries for this filter.</p>
        ) : (
          items.map((item) => <div key={`${item.type}-${item.id}`}>{item.el}</div>)
        )}
      </div>
    </div>
  )
}
