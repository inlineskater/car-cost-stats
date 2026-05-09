import { useMemo } from 'react'
import { format, parseISO, subMonths, startOfMonth } from 'date-fns'
import { useAllFuelEntries } from './useFuelEntries'
import { useAllOtherCosts } from './useOtherCosts'
import type { StatsData, MonthlyBreakdown, ConsumptionPoint } from '@/types'

export function useStats(): { data: StatsData | null; isLoading: boolean } {
  const { data: fuel, isLoading: fl } = useAllFuelEntries()
  const { data: costs, isLoading: cl } = useAllOtherCosts()

  const data = useMemo<StatsData | null>(() => {
    if (!fuel || !costs) return null

    const totalFuelCost = fuel.reduce((s, e) => s + Number(e.total_cost), 0)
    const totalOtherCost = costs.reduce((s, e) => s + Number(e.cost), 0)

    // km range
    const mileages = fuel.map((e) => e.mileage).filter(Boolean)
    const minKm = mileages.length ? Math.min(...mileages) : 0
    const maxKm = mileages.length ? Math.max(...mileages) : 0
    const totalKm = maxKm - minKm
    const costPerKm = totalKm > 0 ? (totalFuelCost + totalOtherCost) / totalKm : null

    // fill-to-fill consumption by fuel type
    const consumptionHistory: ConsumptionPoint[] = []
    const lpgConsumptions: number[] = []
    const petrolConsumptions: number[] = []

    // fuel is sorted ascending by date
    for (let i = 1; i < fuel.length; i++) {
      const prev = fuel[i - 1]
      const curr = fuel[i]
      if (prev.fuel_type !== curr.fuel_type) continue
      const dist = curr.mileage - prev.mileage
      if (dist <= 0 || dist > 2000) continue
      const lPer100 = (Number(prev.liters) / dist) * 100
      consumptionHistory.push({ date: curr.date, fuelType: curr.fuel_type, lPer100km: +lPer100.toFixed(2) })
      if (curr.fuel_type === 'lpg') lpgConsumptions.push(lPer100)
      else petrolConsumptions.push(lPer100)
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    const avgConsumptionLpg = avg(lpgConsumptions)
    const avgConsumptionPetrol = avg(petrolConsumptions)

    // fuel type share
    const lpgTotal = fuel.filter((e) => e.fuel_type === 'lpg').reduce((s, e) => s + Number(e.total_cost), 0)
    const petrolTotal = fuel.filter((e) => e.fuel_type === 'petrol').reduce((s, e) => s + Number(e.total_cost), 0)
    const fuelTotal = lpgTotal + petrolTotal
    const lpgShare = fuelTotal > 0 ? (lpgTotal / fuelTotal) * 100 : 0
    const petrolShare = fuelTotal > 0 ? (petrolTotal / fuelTotal) * 100 : 0

    // monthly breakdown last 12 months
    const monthlyBreakdown: MonthlyBreakdown[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = startOfMonth(subMonths(now, i))
      const monthKey = format(d, 'yyyy-MM')
      const monthLabel = format(d, 'MMM yy')

      const lpgCost = fuel
        .filter((e) => e.fuel_type === 'lpg' && e.date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.total_cost), 0)
      const petrolCost = fuel
        .filter((e) => e.fuel_type === 'petrol' && e.date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.total_cost), 0)
      const otherCost = costs
        .filter((e) => e.date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.cost), 0)

      monthlyBreakdown.push({ month: monthKey, label: monthLabel, lpgCost, petrolCost, otherCost, total: lpgCost + petrolCost + otherCost })
    }

    return {
      totalFuelCost,
      totalOtherCost,
      totalCost: totalFuelCost + totalOtherCost,
      totalKm,
      costPerKm,
      avgConsumptionLpg: avgConsumptionLpg !== null ? +avgConsumptionLpg.toFixed(2) : null,
      avgConsumptionPetrol: avgConsumptionPetrol !== null ? +avgConsumptionPetrol.toFixed(2) : null,
      monthlyBreakdown,
      consumptionHistory,
      lpgShare: +lpgShare.toFixed(1),
      petrolShare: +petrolShare.toFixed(1),
    }
  }, [fuel, costs])

  return { data, isLoading: fl || cl }
}

export function useUpcomingCosts(daysAhead = 30) {
  const { data: costs } = useAllOtherCosts()
  return useMemo(() => {
    if (!costs) return []
    const today = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + daysAhead)
    return costs
      .filter((c) => {
        if (!c.next_due_date) return false
        const d = parseISO(c.next_due_date)
        return d >= today && d <= cutoff
      })
      .sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!))
  }, [costs, daysAhead])
}
