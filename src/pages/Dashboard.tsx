import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Plus, BarChart3, Route, Droplets, Gauge, Table2, Wallet } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import StatCard from '@/components/stats/StatCard'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import CostPerKmChart from '@/components/stats/CostPerKmChart'
import ConsumptionLineChart from '@/components/stats/ConsumptionLineChart'
import KmPerMonthChart from '@/components/stats/KmPerMonthChart'
import ChartRangeFilter, { DEFAULT_RANGE } from '@/components/stats/ChartRangeFilter'
import AmortSettings from '@/components/stats/AmortSettings'
import UpcomingCostsList from '@/components/dashboard/UpcomingCostsList'
import MaintenanceReminders from '@/components/dashboard/MaintenanceReminders'
import RecentEntriesList from '@/components/dashboard/RecentEntriesList'
import Spinner from '@/components/ui/Spinner'
import Section from '@/components/ui/Section'
import ShareBar from '@/components/ui/ShareBar'
import Button from '@/components/ui/Button'
import { useStats, useUpcomingCosts } from '@/hooks/useStats'
import { useAllFuelEntries } from '@/hooks/useFuelEntries'
import { useAllOtherCosts } from '@/hooks/useOtherCosts'
import { cn, formatCurrency } from '@/lib/utils'
import { CHART_COLORS } from '@/lib/chartTheme'
import type { MonthlyBreakdown, ConsumptionPoint } from '@/types'

const CATEGORY_LABEL: Record<string, string> = {
  lpg: 'LPG', petrol: 'Petrol', insurance: 'Insurance', inspection: 'Inspection',
  service: 'Service', repair: 'Service', other: 'Other', tax: 'Tax',
}
const CATEGORY_COLOR: Record<string, string> = {
  LPG: CHART_COLORS.lpg, Petrol: CHART_COLORS.petrol, Insurance: CHART_COLORS.insurance,
  Inspection: CHART_COLORS.inspection, Service: CHART_COLORS.service, Other: CHART_COLORS.other, Tax: CHART_COLORS.km,
}

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
    // compare against the calendar window, not the last N months that happen to have data
    const cutoff = format(new Date(new Date().getFullYear(), new Date().getMonth() - (range === '24m' ? 23 : 11), 1), 'yyyy-MM')
    return points.filter((p) => p.date.substring(0, 7) >= cutoff)
  }
  return points.filter((p) => p.date.startsWith(range))
}

function ChartBlock({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line px-2 pt-4 pb-2">{children}</div>
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [amortized, setAmortized] = useState(true)
  const [range, setRange] = useState<string>(DEFAULT_RANGE)
  const { data: stats, isLoading } = useStats()
  const upcoming = useUpcomingCosts()
  const { data: fuelEntries = [] } = useAllFuelEntries()
  const { data: otherCosts = [] } = useAllOtherCosts()

  const hasAnyData = fuelEntries.length > 0 || otherCosts.length > 0

  // years available in the data, newest first — drives the chart range filter
  const years = stats
    ? [...new Set(stats.monthlyBreakdown.filter((m) => m.total > 0).map((m) => m.month.slice(0, 4)))].sort().reverse()
    : []
  const baseMonthly = stats ? (amortized ? stats.monthlyBreakdownAmortized : stats.monthlyBreakdown) : []
  const monthlyFiltered = filterBreakdown(baseMonthly, range)
  const consumptionFiltered = stats ? filterConsumption(stats.consumptionHistory, range) : []
  const hasKmPerMonth = monthlyFiltered.filter((m) => m.kmDriven !== null && m.kmDriven > 0).length >= 2

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
    for (const c of otherCosts) {
      if (!inRange(c.date)) continue
      const k = CATEGORY_LABEL[c.category] ?? 'Other'
      totals[k] = (totals[k] ?? 0) + Number(c.cost)
    }
    return Object.entries(totals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  })()
  const categoryTotalSum = categoryTotals.reduce((s, [, v]) => s + v, 0)
  const kmInRange = monthlyFiltered.reduce((s, m) => s + (m.kmDriven ?? 0), 0)
  const rangeLabel = range === '12m' ? 'Last 12 months' : range === '24m' ? 'Last 24 months' : range === 'all' ? 'All time' : range

  const costPerKmRows = stats
    ? Object.entries(stats.costPerKmByCategory).filter(([, v]) => v > 0.001).sort((a, b) => b[1] - a[1])
    : []

  const thisMonth = stats?.monthlyBreakdown[stats.monthlyBreakdown.length - 1]

  return (
    <div>
      <TopBar
        title="Dashboard"
        description="Fuel, service and running costs for your car."
        action={
          <Button size="sm" onClick={() => navigate('/add-fuel')} className="flex items-center gap-1">
            <Plus size={15} /> New
          </Button>
        }
      />

      <div className="px-4 md:px-8 lg:px-12 pb-8 max-w-5xl mx-auto space-y-10">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : stats && hasAnyData ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
              <StatCard
                icon={<Wallet size={13} />}
                label="This month"
                value={formatCurrency(thisMonth?.total ?? 0)}
                delta={stats.momCostDelta}
              />
              <StatCard
                icon={<Droplets size={13} />}
                label="LPG average"
                value={stats.avgConsumptionLpg !== null ? `${stats.avgConsumptionLpg}` : '—'}
                sub="L/100km"
                delta={stats.momConsumptionDelta}
              />
              <StatCard
                icon={<Gauge size={13} />}
                label="Cost per km"
                value={stats.costPerKm !== null ? stats.costPerKm.toFixed(2) : '—'}
                sub="zł/km"
              />
              <StatCard
                icon={<Route size={13} />}
                label="Distance tracked"
                value={stats.totalKm.toLocaleString('pl-PL')}
                sub="km"
              />
            </div>

            {/* Reminders first — they need action */}
            <MaintenanceReminders />
            <UpcomingCostsList costs={upcoming} />

            {/* View bar: shared by every chart and table below */}
            <div className="sticky top-11 z-20 -mx-2 px-2 py-1.5 bg-white/95 backdrop-blur border-b border-line flex items-center gap-1 overflow-x-auto no-scrollbar [&>*]:shrink-0">
              <ChartRangeFilter value={range} onChange={setRange} years={years} />
              <span className="w-px h-4 bg-line mx-1" />
              <button onClick={() => setAmortized(true)} className={cn('n-chip', amortized && 'n-chip-active')}>Amortized</button>
              <button onClick={() => setAmortized(false)} className={cn('n-chip', !amortized && 'n-chip-active')}>Actual</button>
              {amortized && <AmortSettings />}
            </div>

            <Section title="Monthly costs" icon={<BarChart3 size={16} />}>
              <ChartBlock><MonthlyBarChart data={monthlyFiltered} /></ChartBlock>
            </Section>

            <div className="grid xl:grid-cols-2 gap-10 xl:gap-6">
              {categoryTotals.length > 0 && (
                <Section title="Spend by category" icon={<Table2 size={16} />} aside={<span>{rangeLabel}</span>}>
                  <div className="overflow-x-auto">
                    <table className="n-table">
                      <thead>
                        <tr><th>Category</th><th className="num">Total</th><th>Share</th></tr>
                      </thead>
                      <tbody>
                        {categoryTotals.map(([label, value]) => (
                          <tr key={label}>
                            <td>
                              <span className="inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLOR[label] }} />
                                {label}
                              </span>
                            </td>
                            <td className="num">{formatCurrency(value)}</td>
                            <td><ShareBar value={(value / categoryTotalSum) * 100} color={CATEGORY_COLOR[label]} /></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="px-2 py-2 text-xs text-ink-muted">
                            Sum{kmInRange > 0 && <> · {kmInRange.toLocaleString('pl-PL')} km</>}
                          </td>
                          <td className="px-2 py-2 num font-semibold">{formatCurrency(categoryTotalSum)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Section>
              )}

              {costPerKmRows.length > 0 && stats.costPerKm !== null && (
                <Section title="Cost per km" icon={<Gauge size={16} />} aside={<span>All time</span>}>
                  <div className="overflow-x-auto">
                    <table className="n-table">
                      <thead>
                        <tr><th>Category</th><th className="num">zł/km</th><th>Share</th></tr>
                      </thead>
                      <tbody>
                        {costPerKmRows.map(([cat, val]) => {
                          const label = CATEGORY_LABEL[cat] ?? cat
                          return (
                            <tr key={cat}>
                              <td>
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLOR[label] }} />
                                  {label}
                                </span>
                              </td>
                              <td className="num">{val.toFixed(2)}</td>
                              <td><ShareBar value={(val / stats.costPerKm!) * 100} color={CATEGORY_COLOR[label]} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="px-2 py-2 text-xs text-ink-muted">Total</td>
                          <td className="px-2 py-2 num font-semibold">{stats.costPerKm.toFixed(2)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Section>
              )}
            </div>

            <Section title="Cost per km by month" icon={<Gauge size={16} />} aside={<span>zł/km</span>}>
              <ChartBlock><CostPerKmChart data={monthlyFiltered} fuelOnly={false} /></ChartBlock>
            </Section>

            <div className="grid xl:grid-cols-2 gap-10 xl:gap-6">
              {stats.consumptionHistory.length > 1 && (
                <Section title="Consumption" icon={<Droplets size={16} />} aside={<span>L/100km</span>}>
                  <ChartBlock>
                    <ConsumptionLineChart
                      data={consumptionFiltered}
                      avgLpg={stats.avgConsumptionLpg}
                      avgPetrol={stats.avgConsumptionPetrol}
                    />
                  </ChartBlock>
                </Section>
              )}
              {hasKmPerMonth && (
                <Section title="Kilometers per month" icon={<Route size={16} />}>
                  <ChartBlock><KmPerMonthChart data={monthlyFiltered} /></ChartBlock>
                </Section>
              )}
            </div>

            <RecentEntriesList fuelEntries={fuelEntries.slice(0, 8)} otherCosts={otherCosts.slice(0, 8)} />
          </>
        ) : (
          <div className="border border-dashed border-line rounded-lg text-center py-14">
            <p className="text-4xl mb-3">⛽</p>
            <p className="text-ink-muted mb-4">No data yet.</p>
            <Button onClick={() => navigate('/add-fuel')}>Add your first fill-up</Button>
          </div>
        )}
      </div>
    </div>
  )
}
