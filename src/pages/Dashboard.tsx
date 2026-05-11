import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import StatCard from '@/components/stats/StatCard'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import CostPerKmChart from '@/components/stats/CostPerKmChart'
import ConsumptionLineChart from '@/components/stats/ConsumptionLineChart'
import UpcomingCostsList from '@/components/dashboard/UpcomingCostsList'
import RecentEntriesList from '@/components/dashboard/RecentEntriesList'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import { useStats, useUpcomingCosts } from '@/hooks/useStats'
import { useAllFuelEntries } from '@/hooks/useFuelEntries'
import { useAllOtherCosts } from '@/hooks/useOtherCosts'
import { formatCurrency } from '@/lib/utils'

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
                <button
                  onClick={() => setAmortized(!amortized)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${amortized ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {amortized ? 'Amortized' : 'Actual'}
                </button>
              </div>
              <MonthlyBarChart data={amortized ? stats.monthlyBreakdownAmortized : stats.monthlyBreakdown} />
            </Card>

            {/* Consumption chart */}
            {stats.consumptionHistory.length > 1 && (
              <Card>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Consumption (L/100km)</h3>
                <ConsumptionLineChart
                  data={stats.consumptionHistory}
                  avgLpg={stats.avgConsumptionLpg}
                  avgPetrol={stats.avgConsumptionPetrol}
                />
              </Card>
            )}

            {/* Cost per km chart */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500">Cost per km (zł/km)</h3>
                <button
                  onClick={() => setAmortized(!amortized)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${amortized ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {amortized ? 'Amortized' : 'Actual'}
                </button>
              </div>
              <CostPerKmChart data={amortized ? stats.monthlyBreakdownAmortized : stats.monthlyBreakdown} fuelOnly={false} />
            </Card>

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
