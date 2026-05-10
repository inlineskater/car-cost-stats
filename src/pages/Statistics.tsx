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
        <p className="text-center text-gray-400 py-16">Add some entries to see statistics.</p>
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
            sub="fuel + other costs"
          />
          <StatCard
            label="Fuel cost"
            value={formatCurrency(stats.totalFuelCost)}
            sub={`Other: ${formatCurrency(stats.totalOtherCost)}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              sub="vs buying same volume at petrol price"
            />
          )}
        </div>

        <Card>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Monthly costs</h3>
          <MonthlyBarChart data={stats.monthlyBreakdown} />
        </Card>

        {stats.totalLitersLpg > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-green-400 mb-3">LPG consumption (L/100km)</h3>
            <ConsumptionLineChart
              data={stats.consumptionHistory}
              fuelType="lpg"
              avg={stats.avgConsumptionLpg}
            />
          </Card>
        )}

        {stats.totalLitersPetrol > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-blue-400 mb-3">Petrol contribution (L/100km)</h3>
            <ConsumptionLineChart
              data={stats.consumptionHistory}
              fuelType="petrol"
              avg={stats.avgConsumptionPetrol}
            />
          </Card>
        )}

        <Card>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Fuel type split</h3>
          <FuelTypeDonut lpgShare={stats.lpgShare} petrolShare={stats.petrolShare} />
        </Card>
      </div>
    </div>
  )
}
