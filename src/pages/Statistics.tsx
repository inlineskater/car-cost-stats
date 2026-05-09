import TopBar from '@/components/layout/TopBar'
import StatCard from '@/components/stats/StatCard'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import FuelTypeDonut from '@/components/stats/FuelTypeDonut'
import ConsumptionLineChart from '@/components/stats/ConsumptionLineChart'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import { useStats } from '@/hooks/useStats'
import { formatCurrency, formatKm } from '@/lib/utils'

export default function Statistics() {
  const { data: stats, isLoading } = useStats()

  if (isLoading) {
    return (
      <div>
        <TopBar title="Statistics" />
        <div className="flex justify-center py-16"><Spinner /></div>
      </div>
    )
  }

  if (!stats || stats.totalCost === 0) {
    return (
      <div>
        <TopBar title="Statistics" />
        <p className="text-center text-slate-500 py-16">Add some entries to see statistics.</p>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Statistics" />
      <div className="p-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total spend" value={formatCurrency(stats.totalCost)} />
          <StatCard label="km tracked" value={formatKm(stats.totalKm)} />
          <StatCard
            label="Cost / km"
            value={stats.costPerKm ? `${stats.costPerKm.toFixed(2)} zł` : '—'}
          />
          <StatCard
            label="Fuel cost"
            value={formatCurrency(stats.totalFuelCost)}
            sub={`Other: ${formatCurrency(stats.totalOtherCost)}`}
          />
        </div>

        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Monthly costs</h3>
          <MonthlyBarChart data={stats.monthlyBreakdown} />
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Fuel consumption (L/100km)</h3>
          <ConsumptionLineChart data={stats.consumptionHistory} />
          {stats.avgConsumptionLpg !== null && (
            <p className="text-xs text-slate-400 mt-2">
              Avg LPG: {stats.avgConsumptionLpg} L/100km
              {stats.avgConsumptionPetrol !== null && ` · Avg Petrol: ${stats.avgConsumptionPetrol} L/100km`}
            </p>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Fuel type split</h3>
          <FuelTypeDonut lpgShare={stats.lpgShare} petrolShare={stats.petrolShare} />
        </Card>
      </div>
    </div>
  )
}
