export type { FuelType, CostCategory, FuelEntryRow, FuelEntryInsert, OtherCostRow, OtherCostInsert } from './database'

export interface ParsedFuelEntry {
  fuel_type: 'lpg' | 'petrol' | null
  liters: number | null
  price_per_liter: number | null
  total_cost: number | null
  source_image_index: number | null
}

export interface ParsedReceiptData {
  date: string | null
  mileage: number | null
  odometer_image_index: number | null
  entries: ParsedFuelEntry[]
  confidence: 'high' | 'medium' | 'low'
  parsing_notes: string
}

export interface MonthlyBreakdown {
  month: string       // 'YYYY-MM'
  label: string       // 'Jan 24'
  lpgCost: number
  petrolCost: number
  otherCost: number
  total: number
  kmDriven: number | null
  lpgCostPerKm: number | null
  petrolCostPerKm: number | null
  otherCostPerKm: number | null
  // per-category cost/km for stacked chart
  insuranceCostPerKm: number | null
  inspectionCostPerKm: number | null
  serviceCostPerKm: number | null
  repairCostPerKm: number | null
  otherCatCostPerKm: number | null
}

export interface ConsumptionPoint {
  date: string
  fuelType: 'lpg' | 'petrol'
  lPer100km: number
}

export interface StatsData {
  totalFuelCost: number
  totalOtherCost: number
  totalCost: number
  totalKm: number
  costPerKm: number | null
  costPerKmByCategory: Record<string, number>
  lpgCostPerKm: number | null
  petrolCostPerKm: number | null
  otherCostPerKm: number | null
  avgConsumptionLpg: number | null
  avgConsumptionPetrol: number | null
  monthlyBreakdown: MonthlyBreakdown[]
  consumptionHistory: ConsumptionPoint[]
  lpgShare: number    // 0-100 percent
  petrolShare: number
  totalLitersLpg: number
  totalLitersPetrol: number
  avgPricePerLiterLpg: number | null
  avgPricePerLiterPetrol: number | null
  fillUpCountLpg: number
  fillUpCountPetrol: number
  lpgSavings: number | null   // cost saved vs buying same volume at petrol prices
  // month-over-month deltas (positive = more/worse, negative = less/better)
  momCostDelta: number | null    // % change in total cost vs previous month
  momLpgLitersDelta: number | null  // % change in LPG liters vs previous month
  momConsumptionDelta: number | null  // % change in avg LPG L/100km vs previous month
  // fill-up interval stats (LPG)
  avgDaysBetweenLpgFills: number | null
  avgKmBetweenLpgFills: number | null
  maxKmOnOneLpgTank: number | null
}

export interface HistoryFilters {
  fuelType: 'all' | 'lpg' | 'petrol' | 'other'
  month: string | null   // 'YYYY-MM' or null for all
}
