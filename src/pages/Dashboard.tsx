import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fuel, Plus } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import StatCard from '@/components/stats/StatCard'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import FuelTypeDonut from '@/components/stats/FuelTypeDonut'
import ConsumptionLineChart from '@/components/stats/ConsumptionLineChart'
import CostPerKmChart from '@/components/stats/CostPerKmChart'
import KmPerMonthChart from '@/components/stats/KmPerMonthChart'
import PriceTrendChart from '@/components/stats/PriceTrendChart'
import UpcomingCostsList from '@/components/dashboard/UpcomingCostsList'
import RecentEntriesList from '@/components/dashboard/RecentEntriesList'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import { useStats, useUpcomingCosts } from '@/hooks/useStats'
import { useAllFuelEntries } from '@/hooks/useFuelEntries'
import { useAllOtherCosts } from '@/hooks/useOtherCosts'
import { formatCurrency, formatKm } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const [amortized, setAmortized] = useState(true)
  const { data: stats, isLoading } = useStats()
  const upcoming = useUpcomingCosts()
  const { data: fuelEntries = [] } = useAllFuelEntries()
  const { data: otherCosts = [] } = useAllOtherCosts()

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

      <div className="p-4 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total cost"
                value={formatCurrency(stats.totalCost)}
                sub={stats.totalKm > 0 ? `over ${formatKm(stats.totalKm)}` : undefined}
                icon={<Fuel size={14} />}
              />
              <StatCard
                label="This month"
                value={formatCurrency(stats.monthlyBreakdown[stats.monthlyBreakdown.length - 1]?.total ?? 0)}
                sub="total cost"
                delta={stats.momCostDelta}
              />
              <StatCard
                label="Fuel / km"
                value={stats.costPerKm !== null && stats.lpgCostPerKm !== null
                  ? `${(stats.lpgCostPerKm + (stats.petrolCostPerKm ?? 0)).toFixed(2)} zł`
                  : '—'}
                sub={[
                  stats.lpgCostPerKm !== null ? `LPG ${stats.lpgCostPerKm.toFixed(2)}` : null,
                  stats.petrolCostPerKm !== null ? `Petrol ${stats.petrolCostPerKm.toFixed(2)}` : null,
                ].filter(Boolean).join(' · ')}
              />
              {stats.costPerKm !== null && (
                <div className="col-span-2 bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total / km</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.costPerKm.toFixed(2)} zł</p>
                  <div className="mt-2 space-y-1">
                    {Object.entries(stats.costPerKmByCategory)
                      .filter(([, v]) => v > 0.001)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, val]) => {
                        const pct = stats.costPerKm! > 0 ? (val / stats.costPerKm!) * 100 : 0
                        return (
                          <div key={cat} className="flex items-center gap-2 text-xs">
                            <span className="w-16 text-gray-500 capitalize">{cat}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-gray-600 w-14 text-right">{val.toFixed(2)} zł</span>
                            <span className="text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
              {stats.avgConsumptionLpg !== null && (
                <StatCard
                  label="Avg LPG"
                  value={`${stats.avgConsumptionLpg} L`}
                  sub="per 100 km"
                  delta={stats.momConsumptionDelta}
                />
              )}
              {stats.avgConsumptionPetrol !== null && (
                <StatCard
                  label="Avg Petrol"
                  value={`${stats.avgConsumptionPetrol} L`}
                  sub="per 100 km"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Fuel cost"
                value={formatCurrency(stats.totalFuelCost)}
                sub={`Other: ${formatCurrency(stats.totalOtherCost)}`}
              />
              {stats.totalLitersLpg > 0 && (
                <StatCard
                  label="LPG total"
                  value={`${stats.totalLitersLpg.toFixed(0)} L`}
                  sub={stats.avgPricePerLiterLpg !== null
                    ? `avg ${stats.avgPricePerLiterLpg.toFixed(3)} zł/L · ${stats.fillUpCountLpg} fill-ups`
                    : `${stats.fillUpCountLpg} fill-ups`}
                />
              )}
              {stats.totalLitersPetrol > 0 && (
                <StatCard
                  label="Petrol total"
                  value={`${stats.totalLitersPetrol.toFixed(0)} L`}
                  sub={stats.avgPricePerLiterPetrol !== null
                    ? `avg ${stats.avgPricePerLiterPetrol.toFixed(3)} zł/L · ${stats.fillUpCountPetrol} fill-ups`
                    : `${stats.fillUpCountPetrol} fill-ups`}
                />
              )}
              {stats.lpgSavings !== null && stats.lpgSavings > 0 && (
                <StatCard
                  label="LPG savings"
                  value={formatCurrency(stats.lpgSavings)}
                  sub="vs petrol price"
                />
              )}
            </div>

            {(stats.avgDaysBetweenLpgFills !== null || stats.avgKmBetweenLpgFills !== null) && (
              <div className="grid grid-cols-2 gap-3">
                {stats.avgDaysBetweenLpgFills !== null && (
                  <StatCard
                    label="LPG interval"
                    value={`${stats.avgDaysBetweenLpgFills}d`}
                    sub="avg days between fills"
                  />
                )}
                {stats.avgKmBetweenLpgFills !== null && (
                  <StatCard
                    label="LPG range"
                    value={formatKm(stats.avgKmBetweenLpgFills)}
                    sub="avg km per tank"
                  />
                )}
              </div>
            )}

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500">Monthly costs</h3>
                <button
                  onClick={() => setAmortized(!amortized)}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {amortized ? 'Amortized' : 'Normal'}
                </button>
              </div>
              <MonthlyBarChart data={amortized ? stats.monthlyBreakdownAmortized : stats.monthlyBreakdown} />
            </Card>

            {stats.consumptionHistory.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Avg consumption (L/100km)</h3>
                <ConsumptionLineChart
                  data={stats.consumptionHistory}
                  avgLpg={stats.avgConsumptionLpg}
                  avgPetrol={stats.avgConsumptionPetrol}
                />
              </Card>
            )}

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500">Cost per km by month (zł/km)</h3>
                <button
                  onClick={() => setAmortized(!amortized)}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {amortized ? 'Amortized' : 'Normal'}
                </button>
              </div>
              <CostPerKmChart data={amortized ? stats.monthlyBreakdownAmortized : stats.monthlyBreakdown} />
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Km per month</h3>
              <KmPerMonthChart data={stats.monthlyBreakdown} />
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Fuel type split</h3>
              <FuelTypeDonut lpgShare={stats.lpgShare} petrolShare={stats.petrolShare} />
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Fuel price trend (zł/L)</h3>
              <PriceTrendChart />
            </Card>

            <UpcomingCostsList costs={upcoming} />
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
