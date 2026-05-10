import { useMemo } from 'react'
import { format, parseISO, subMonths, startOfMonth, differenceInDays } from 'date-fns'
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

    const lpgEntries = fuel.filter((e) => e.fuel_type === 'lpg').sort((a, b) => a.mileage - b.mileage)
    const petrolEntries = fuel.filter((e) => e.fuel_type === 'petrol').sort((a, b) => a.mileage - b.mileage)

    const calcFillToFill = (entries: typeof fuel, maxDist: number) => {
      for (let i = 1; i < entries.length; i++) {
        const prev = entries[i - 1]
        const curr = entries[i]
        const dist = curr.mileage - prev.mileage
        if (dist <= 0 || dist > maxDist) continue
        const lPer100 = (Number(curr.liters) / dist) * 100
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

    const lpgCostPerKm = totalKm > 0 ? lpgTotal / totalKm : null
    const petrolCostPerKm = totalKm > 0 ? petrolTotal / totalKm : null
    const otherCostPerKm = totalKm > 0 ? totalOtherCost / totalKm : null

    // per-category cost/km breakdown
    const costByCategory: Record<string, number> = {}
    for (const c of costs) {
      const cat = c.category === 'repair' ? 'service' : c.category
      costByCategory[cat] = (costByCategory[cat] ?? 0) + Number(c.cost)
    }
    const costPerKmByCategory: Record<string, number> = {}
    if (totalKm > 0) {
      costPerKmByCategory['lpg'] = +(lpgTotal / totalKm).toFixed(2)
      costPerKmByCategory['petrol'] = +(petrolTotal / totalKm).toFixed(2)
      for (const [cat, total] of Object.entries(costByCategory)) {
        costPerKmByCategory[cat] = +(total / totalKm).toFixed(2)
      }
    }

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

    // fill-up interval stats for LPG
    let avgDaysBetweenLpgFills: number | null = null
    let avgKmBetweenLpgFills: number | null = null
    let maxKmOnOneLpgTank: number | null = null
    if (lpgEntries.length >= 2) {
      const dayGaps: number[] = []
      const kmGaps: number[] = []
      for (let i = 1; i < lpgEntries.length; i++) {
        const days = differenceInDays(parseISO(lpgEntries[i].date), parseISO(lpgEntries[i - 1].date))
        const km = lpgEntries[i].mileage - lpgEntries[i - 1].mileage
        if (days > 0) dayGaps.push(days)
        if (km > 0) kmGaps.push(km)
      }
      if (dayGaps.length) avgDaysBetweenLpgFills = Math.round(dayGaps.reduce((a, b) => a + b, 0) / dayGaps.length)
      if (kmGaps.length) {
        avgKmBetweenLpgFills = Math.round(kmGaps.reduce((a, b) => a + b, 0) / kmGaps.length)
        maxKmOnOneLpgTank = Math.max(...kmGaps)
      }
    }

    // max odometer reading per calendar month — used to derive km driven per month
    const maxMileageByMonth = new Map<string, number>()
    for (const e of fuel) {
      const m = e.date.substring(0, 7)
      maxMileageByMonth.set(m, Math.max(maxMileageByMonth.get(m) ?? 0, e.mileage))
    }

    // monthly breakdown last 12 months
    const monthlyBreakdown: MonthlyBreakdown[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = startOfMonth(subMonths(now, i))
      const monthKey = format(d, 'yyyy-MM')
      const monthLabel = format(d, 'MMM')
      const prevMonthKey = format(subMonths(d, 1), 'yyyy-MM')

      const lpgCost = fuel
        .filter((e) => e.fuel_type === 'lpg' && e.date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.total_cost), 0)
      const petrolCost = fuel
        .filter((e) => e.fuel_type === 'petrol' && e.date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.total_cost), 0)
      const otherCost = costs
        .filter((e) => e.date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.cost), 0)

      const monthCosts = costs.filter((e) => e.date.startsWith(monthKey))
      const insuranceCost = monthCosts.filter((e) => e.category === 'insurance').reduce((s, e) => s + Number(e.cost), 0)
      const inspectionCost = monthCosts.filter((e) => e.category === 'inspection').reduce((s, e) => s + Number(e.cost), 0)
      const serviceCost = monthCosts.filter((e) => e.category === 'service' || e.category === 'repair').reduce((s, e) => s + Number(e.cost), 0)
      const repairCost = 0
      const otherCatCost = monthCosts.filter((e) => e.category === 'other' || e.category === 'tax').reduce((s, e) => s + Number(e.cost), 0)

      const thisMax = maxMileageByMonth.get(monthKey) ?? null
      const prevMax = maxMileageByMonth.get(prevMonthKey) ?? null
      const kmDriven = thisMax !== null && prevMax !== null && thisMax > prevMax ? thisMax - prevMax : null
      const lpgCostPerKm = kmDriven ? +(lpgCost / kmDriven).toFixed(2) : null
      const otherCostPerKm = kmDriven ? +(otherCost / kmDriven).toFixed(2) : null

      monthlyBreakdown.push({
        month: monthKey, label: monthLabel,
        lpgCost, petrolCost, otherCost, total: lpgCost + petrolCost + otherCost,
        kmDriven, lpgCostPerKm, petrolCostPerKm: null, otherCostPerKm,
        insuranceCostPerKm: kmDriven ? +(insuranceCost / kmDriven).toFixed(2) : null,
        inspectionCostPerKm: kmDriven ? +(inspectionCost / kmDriven).toFixed(2) : null,
        serviceCostPerKm: kmDriven ? +(serviceCost / kmDriven).toFixed(2) : null,
        repairCostPerKm: kmDriven ? +(repairCost / kmDriven).toFixed(2) : null,
        otherCatCostPerKm: kmDriven ? +(otherCatCost / kmDriven).toFixed(2) : null,
      })
    }

    // Spread petrol cost/km evenly: total petrol cost ÷ total km across all months
    const totalPetrolInBreakdown = monthlyBreakdown.reduce((s, m) => s + m.petrolCost, 0)
    const totalKmInBreakdown = monthlyBreakdown.reduce((s, m) => s + (m.kmDriven ?? 0), 0)
    const spreadPetrolPerKm = totalKmInBreakdown > 0 ? +(totalPetrolInBreakdown / totalKmInBreakdown).toFixed(2) : null
    for (const m of monthlyBreakdown) {
      if (m.kmDriven) m.petrolCostPerKm = spreadPetrolPerKm
    }

    // Amortized breakdown: spread ALL-TIME other costs over months since first fuel entry
    const earliestFuelDate = fuel.length ? fuel.reduce((min, e) => e.date < min ? e.date : min, fuel[0].date) : null
    const monthsSinceStart = earliestFuelDate
      ? Math.max(1, (now.getFullYear() - parseInt(earliestFuelDate.slice(0, 4))) * 12 + (now.getMonth() + 1 - parseInt(earliestFuelDate.slice(5, 7))))
      : 12
    // Per-category amortized (all-time)
    const catTotals: Record<string, number> = {}
    for (const c of costs) {
      catTotals[c.category] = (catTotals[c.category] ?? 0) + Number(c.cost)
    }
    const amortInsurance = (() => {
      const entries = costs.filter((c) => c.category === 'insurance')
      if (!entries.length) return 0
      let total = 0
      for (const c of entries) {
        const months = c.next_due_date
          ? Math.max(1, Math.round(differenceInDays(parseISO(c.next_due_date), parseISO(c.date)) / 30.44))
          : 12
        total += Number(c.cost) / months
      }
      return total
    })()
    const amortInspection = (() => {
      const entries = costs.filter((c) => c.category === 'inspection')
      if (!entries.length) return 0
      let total = 0
      for (const c of entries) {
        const months = c.next_due_date
          ? Math.max(1, Math.round(differenceInDays(parseISO(c.next_due_date), parseISO(c.date)) / 30.44))
          : 12
        total += Number(c.cost) / months
      }
      return total
    })()
    const amortService = ((catTotals['service'] ?? 0) + (catTotals['repair'] ?? 0)) / monthsSinceStart
    const amortRepair = 0
    const amortOtherCat = ((catTotals['other'] ?? 0) + (catTotals['tax'] ?? 0)) / monthsSinceStart
    const amortizedOtherPerMonth = amortInsurance + amortInspection + amortService + amortOtherCat

    const monthlyBreakdownAmortized: MonthlyBreakdown[] = monthlyBreakdown.map((m) => {
      const total = m.lpgCost + m.petrolCost + amortizedOtherPerMonth
      const kmDriven = m.kmDriven
      return {
        ...m,
        otherCost: +amortizedOtherPerMonth.toFixed(2),
        total: +total.toFixed(2),
        otherCostPerKm: kmDriven ? +(amortizedOtherPerMonth / kmDriven).toFixed(2) : null,
        insuranceCostPerKm: kmDriven ? +(amortInsurance / kmDriven).toFixed(2) : null,
        inspectionCostPerKm: kmDriven ? +(amortInspection / kmDriven).toFixed(2) : null,
        serviceCostPerKm: kmDriven ? +(amortService / kmDriven).toFixed(2) : null,
        repairCostPerKm: kmDriven ? +(amortRepair / kmDriven).toFixed(2) : null,
        otherCatCostPerKm: kmDriven ? +(amortOtherCat / kmDriven).toFixed(2) : null,
      }
    })

    // month-over-month deltas — compare two most-recent months that have any cost
    const monthsWithData = monthlyBreakdown.filter((m) => m.total > 0)
    let momCostDelta: number | null = null
    let momLpgLitersDelta: number | null = null
    let momConsumptionDelta: number | null = null
    if (monthsWithData.length >= 2) {
      const curr = monthsWithData[monthsWithData.length - 1]
      const prev = monthsWithData[monthsWithData.length - 2]
      if (prev.total > 0) momCostDelta = +((curr.total - prev.total) / prev.total * 100).toFixed(1)

      const currLpgL = lpgEntries.filter((e) => e.date.startsWith(curr.month)).reduce((s, e) => s + Number(e.liters), 0)
      const prevLpgL = lpgEntries.filter((e) => e.date.startsWith(prev.month)).reduce((s, e) => s + Number(e.liters), 0)
      if (prevLpgL > 0) momLpgLitersDelta = +((currLpgL - prevLpgL) / prevLpgL * 100).toFixed(1)

      const currConsumption = monthlyConsumption.find((p) => p.fuelType === 'lpg' && p.date.startsWith(curr.month))
      const prevConsumption = monthlyConsumption.find((p) => p.fuelType === 'lpg' && p.date.startsWith(prev.month))
      if (currConsumption && prevConsumption && prevConsumption.lPer100km > 0) {
        momConsumptionDelta = +((currConsumption.lPer100km - prevConsumption.lPer100km) / prevConsumption.lPer100km * 100).toFixed(1)
      }
    }

    return {
      totalFuelCost,
      totalOtherCost,
      totalCost: totalFuelCost + totalOtherCost,
      totalKm,
      costPerKm,
      costPerKmByCategory,
      lpgCostPerKm: lpgCostPerKm !== null ? +lpgCostPerKm.toFixed(2) : null,
      petrolCostPerKm: petrolCostPerKm !== null ? +petrolCostPerKm.toFixed(2) : null,
      otherCostPerKm: otherCostPerKm !== null ? +otherCostPerKm.toFixed(2) : null,
      avgConsumptionLpg: avgConsumptionLpg !== null ? +avgConsumptionLpg.toFixed(2) : null,
      avgConsumptionPetrol: avgConsumptionPetrol !== null ? +avgConsumptionPetrol.toFixed(2) : null,
      monthlyBreakdown,
      monthlyBreakdownAmortized,
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
      momCostDelta,
      momLpgLitersDelta,
      momConsumptionDelta,
      avgDaysBetweenLpgFills,
      avgKmBetweenLpgFills,
      maxKmOnOneLpgTank,
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
