import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import StatCard from '@/components/stats/StatCard'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import CostPerKmChart from '@/components/stats/CostPerKmChart'
import ConsumptionLineChart from '@/components/stats/ConsumptionLineChart'
import ChartRangeFilter, { DEFAULT_RANGE } from '@/components/stats/ChartRangeFilter'
import AmortSettings from '@/components/stats/AmortSettings'
import UpcomingCostsList from '@/components/dashboard/UpcomingCostsList'
import MaintenanceReminders from '@/components/dashboard/MaintenanceReminders'
import RecentEntriesList from '@/components/dashboard/RecentEntriesList'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import { useStats, useUpcomingCosts } from '@/hooks/useStats'
import { useAllFuelEntries } from '@/hooks/useFuelEntries'
import { useAllOtherCosts } from '@/hooks/useOtherCosts'
import { formatCurrency } from '@/lib/utils'
import type { MonthlyBreakdown, ConsumptionPoint } from '@/types'

function filterBreakdown(data: MonthlyBreakdown[], range: string): MonthlyBreakdown[] {
  let filtered: MonthlyBreakdown[]
  if (range === 'all') filtered = data
  else if (range === '12m') filtered = data.slice(-12)
  else if (range === '24m') filtered = data.slice(-24)
  else filtered = data.filter((m) => m.month.startsWith(range))

  // include the year in the label only when the window spans multiple years
  const spansYears = new Set(filtered.map((m) => m.month.slice(0, 4))).size > 1
  const fmt = spansYears ? 'MMM yy' : 'MMM'
  return filtered.map((m) => ({ ...m, label: format(parseISO(`${m.month}-01`), fmt) }))
}

function filterConsumption(points: ConsumptionPoint[], range: string): ConsumptionPoint[] {
  if (range === 'all') return points
  if (range === '12m' || range === '24m') {
    const months = [...new Set(points.map((p) => p.date.substring(0, 7)))].sort()
    const keep = new Set(months.slice(range === '24m' ? -24 : -12))
    return points.filter((p) => keep.has(p.date.substring(0, 7)))
  }
  return points.filter((p) => p.date.startsWith(range))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [amortized, setAmortized] = useState(true)
  const [range, setRange] = useState<string>(DEFAULT_RANGE)
  const { data: stats, isLoading } = useStats()
  const upcoming = useUpcomingCosts()
  const { data: fuelEntries = [] } = useAllFuelEntries()
  const { data: otherCosts = [] } = useAllOtherCosts()

  // years available in the data, newest first — drives the chart range filter
  const years = stats
    ? [...new Set(stats.monthlyBreakdown.filter((m) => m.total > 0).map((m) => m.month.slice(0, 4)))].sort().reverse()
    : []
  const baseMonthly = stats ? (amortized ? stats.monthlyBreakdownAmortized : stats.monthlyBreakdown) : []
  const monthlyFiltered = filterBreakdown(baseMonthly, range)
  const consumptionFiltered = stats ? filterConsumption(stats.consumptionHistory, range) : []

  // actual cash spent per category within the selected range (months shown in the chart)
  const monthSet = new Set(monthlyFiltered.map((m) => m.month))
  const inRange = (date: string) => monthSet.has(date.substring(0, 7))
  const categoryTotals = (() => {
    const totals: Record<string, number> = {}
    for (const e of fuelEntries) {
      if (!inRange(e.date)) continue
      const k = e.fuel_type === 'lpg' ? 'LPG' : 'Petrol'
      totals[k] = (totals[k] ?? 0) + Number(e.total_cost)
    }
    const catLabel: Record<string, string> = {
      insurance: 'Insurance', inspection: 'Inspection',
      service: 'Service', repair: 'Service', other: 'Other', tax: 'Tax',
    }
    for (const c of otherCosts) {
      if (!inRange(c.date)) continue
      const k = catLabel[c.category] ?? 'Other'
      totals[k] = (totals[k] ?? 0) + Number(c.cost)
    }
    return Object.entries(totals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  })()
  const categoryTotalSum = categoryTotals.reduce((s, [, v]) => s + v, 0)
  const rangeLabel = range === '12m' ? 'last 12 mo' : range === '24m' ? 'last 24 mo' : range === 'all' ? 'all time' : range

  return (
    <div>
      <TopBar
        title="Dashboard"
        action={
          <button
            onClick={() => navigate('/add-fuel')}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : stats ? (
          <>
            {/* 3 key KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="This month"
                value={formatCurrency(stats.monthlyBreakdown[stats.monthlyBreakdown.length - 1]?.total ?? 0)}
                delta={stats.momCostDelta}
              />
              <StatCard
                label="LPG avg"
                value={stats.avgConsumptionLpg !== null ? `${stats.avgConsumptionLpg}` : '—'}
                sub="L/100km"
                delta={stats.momConsumptionDelta}
              />
              <StatCard
                label="Cost / km"
                value={stats.costPerKm !== null ? `${stats.costPerKm.toFixed(2)}` : '—'}
                sub="zł/km"
              />
            </div>

            {/* Cost per km breakdown */}
            {stats.costPerKm !== null && (
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Cost / km</p>
                  <p className="text-lg font-bold text-gray-900">{stats.costPerKm.toFixed(2)} zł</p>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(stats.costPerKmByCategory)
                    .filter(([, v]) => v > 0.001)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, val]) => (
                      <div key={cat} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-gray-500 capitalize">{cat}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(val / stats.costPerKm!) * 100}%` }} />
                        </div>
                        <span className="text-gray-600 w-12 text-right">{val.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* Monthly costs chart */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500">Monthly costs</h3>
                <div className="flex items-center gap-2">
                  {amortized && <AmortSettings />}
                  <button
                    onClick={() => setAmortized(!amortized)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${amortized ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {amortized ? 'Amortized' : 'Actual'}
                  </button>
                  <ChartRangeFilter value={range} onChange={setRange} years={years} />
                </div>
              </div>
              <MonthlyBarChart data={monthlyFiltered} />
            </Card>

            {/* Total cost per category for the selected range */}
            {categoryTotals.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500">Cost by category · {rangeLabel}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-gray-900">{formatCurrency(categoryTotalSum)}</p>
                    <ChartRangeFilter value={range} onChange={setRange} years={years} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {categoryTotals.map(([label, value]) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className="w-20 text-gray-500">{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(value / categoryTotalSum) * 100}%` }} />
                      </div>
                      <span className="text-gray-600 w-16 text-right">{formatCurrency(value)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Consumption chart */}
            {stats.consumptionHistory.length > 1 && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500">Consumption (L/100km)</h3>
                  <ChartRangeFilter value={range} onChange={setRange} years={years} />
                </div>
                <ConsumptionLineChart
                  data={consumptionFiltered}
                  avgLpg={stats.avgConsumptionLpg}
                  avgPetrol={stats.avgConsumptionPetrol}
                />
              </Card>
            )}

            {/* Cost per km chart */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500">Cost per km (zł/km)</h3>
                <div className="flex items-center gap-2">
                  {amortized && <AmortSettings />}
                  <button
                    onClick={() => setAmortized(!amortized)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${amortized ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {amortized ? 'Amortized' : 'Actual'}
                  </button>
                  <ChartRangeFilter value={range} onChange={setRange} years={years} />
                </div>
              </div>
              <CostPerKmChart data={monthlyFiltered} fuelOnly={false} />
            </Card>

            {/* Maintenance & renewals due */}
            <MaintenanceReminders />

            {/* Upcoming costs */}
            <UpcomingCostsList costs={upcoming} />

            {/* Recent entries */}
            <RecentEntriesList fuelEntries={fuelEntries.slice(0, 5)} otherCosts={otherCosts.slice(0, 3)} />
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No data yet.</p>
            <button
              onClick={() => navigate('/add-fuel')}
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Add your first fill-up
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
