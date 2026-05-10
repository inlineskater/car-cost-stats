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

    // fill-to-fill consumption — group by type first so petrol (filled rarely)
    // is compared to the previous petrol fill-up, spanning all the LPG km in between
    const consumptionHistory: ConsumptionPoint[] = []
    const lpgConsumptions: number[] = []
    const petrolConsumptions: number[] = []

    const lpgEntries = fuel.filter((e) => e.fuel_type === 'lpg')
    const petrolEntries = fuel.filter((e) => e.fuel_type === 'petrol')

    const calcFillToFill = (entries: typeof fuel, maxDist: number) => {
      for (let i = 1; i < entries.length; i++) {
        const prev = entries[i - 1]
        const curr = entries[i]
        const dist = curr.mileage - prev.mileage
        if (dist <= 0 || dist > maxDist) continue
        const lPer100 = (Number(prev.liters) / dist) * 100
        consumptionHistory.push({ date: curr.date, fuelType: curr.fuel_type, lPer100km: +lPer100.toFixed(2) })
        if (curr.fuel_type === 'lpg') lpgConsumptions.push(lPer100)
        else petrolConsumptions.push(lPer100)
      }
    }

    calcFillToFill(lpgEntries, 1200)
    calcFillToFill(petrolEntries, 15000)

    // Average fill-to-fill readings per month so the chart shows one smooth
    // data point per month instead of noisy per-fill-up spikes
    const byMonth = new Map<string, { lpgSum: number; lpgCount: number; petrolSum: number; petrolCount: number }>()
    for (const p of consumptionHistory) {
      const month = p.date.substring(0, 7)
      const e = byMonth.get(month) ?? { lpgSum: 0, lpgCount: 0, petrolSum: 0, petrolCount: 0 }
      if (p.fuelType === 'lpg') { e.lpgSum += p.lPer100km; e.lpgCount++ }
      else { e.petrolSum += p.lPer100km; e.petrolCount++ }
      byMonth.set(month, e)
    }
    const monthlyConsumption: ConsumptionPoint[] = []
    for (const [month, d] of [...byMonth.entries()].sort()) {
      if (d.lpgCount > 0) monthlyConsumption.push({ date: `${month}-01`, fuelType: 'lpg', lPer100km: +(d.lpgSum / d.lpgCount).toFixed(2) })
      if (d.petrolCount > 0) monthlyConsumption.push({ date: `${month}-01`, fuelType: 'petrol', lPer100km: +(d.petrolSum / d.petrolCount).toFixed(2) })
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    const avgConsumptionLpg = avg(lpgConsumptions)
    const avgConsumptionPetrol = avg(petrolConsumptions)

    // fuel type share + totals
    const lpgTotal = lpgEntries.reduce((s, e) => s + Number(e.total_cost), 0)
    const petrolTotal = petrolEntries.reduce((s, e) => s + Number(e.total_cost), 0)
    const fuelTotal = lpgTotal + petrolTotal
    const lpgShare = fuelTotal > 0 ? (lpgTotal / fuelTotal) * 100 : 0
    const petrolShare = fuelTotal > 0 ? (petrolTotal / fuelTotal) * 100 : 0

    const totalLitersLpg = lpgEntries.reduce((s, e) => s + Number(e.liters), 0)
    const totalLitersPetrol = petrolEntries.reduce((s, e) => s + Number(e.liters), 0)

    // weighted average price per liter (volume-weighted, not simple mean)
    const avgPricePerLiterLpg = totalLitersLpg > 0
      ? lpgEntries.reduce((s, e) => s + Number(e.price_per_liter) * Number(e.liters), 0) / totalLitersLpg
      : null
    const avgPricePerLiterPetrol = totalLitersPetrol > 0
      ? petrolEntries.reduce((s, e) => s + Number(e.price_per_liter) * Number(e.liters), 0) / totalLitersPetrol
      : null

    // estimated savings: cost if LPG volume had been bought at petrol prices instead
    const lpgSavings = (avgPricePerLiterLpg !== null && avgPricePerLiterPetrol !== null)
      ? (avgPricePerLiterPetrol - avgPricePerLiterLpg) * totalLitersLpg
      : null

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
      consumptionHistory: monthlyConsumption,
      lpgShare: +lpgShare.toFixed(1),
      petrolShare: +petrolShare.toFixed(1),
      totalLitersLpg: +totalLitersLpg.toFixed(1),
      totalLitersPetrol: +totalLitersPetrol.toFixed(1),
      avgPricePerLiterLpg: avgPricePerLiterLpg !== null ? +avgPricePerLiterLpg.toFixed(4) : null,
      avgPricePerLiterPetrol: avgPricePerLiterPetrol !== null ? +avgPricePerLiterPetrol.toFixed(4) : null,
      fillUpCountLpg: lpgEntries.length,
      fillUpCountPetrol: petrolEntries.length,
      lpgSavings: lpgSavings !== null ? +lpgSavings.toFixed(2) : null,
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
