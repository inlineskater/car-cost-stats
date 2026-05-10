import { useNavigate } from 'react-router-dom'
import { Fuel, Plus } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import StatCard from '@/components/stats/StatCard'
import UpcomingCostsList from '@/components/dashboard/UpcomingCostsList'
import RecentEntriesList from '@/components/dashboard/RecentEntriesList'
import Spinner from '@/components/ui/Spinner'
import { useStats, useUpcomingCosts } from '@/hooks/useStats'
import { useAllFuelEntries } from '@/hooks/useFuelEntries'
import { useAllOtherCosts } from '@/hooks/useOtherCosts'
import { formatCurrency, formatKm } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
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
                label="Cost / km"
                value={stats.costPerKm !== null ? `${stats.costPerKm.toFixed(2)} zł` : '—'}
                sub="all costs included"
              />
              {stats.avgConsumptionLpg !== null && (
                <StatCard
                  label="Avg LPG"
                  value={`${stats.avgConsumptionLpg} L`}
                  sub="per 100 km"
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
