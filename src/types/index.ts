export type { FuelType, CostCategory, FuelEntryRow, FuelEntryInsert, OtherCostRow, OtherCostInsert } from './database'

export interface ParsedFuelEntry {
  fuel_type: 'lpg' | 'petrol' | null
  liters: number | null
  price_per_liter: number | null
  total_cost: number | null
}

export interface ParsedReceiptData {
  date: string | null
  mileage: number | null
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
  avgConsumptionLpg: number | null
  avgConsumptionPetrol: number | null
  monthlyBreakdown: MonthlyBreakdown[]
  consumptionHistory: ConsumptionPoint[]
  lpgShare: number    // 0-100 percent
  petrolShare: number
}

export interface HistoryFilters {
  fuelType: 'all' | 'lpg' | 'petrol' | 'other'
  month: string | null   // 'YYYY-MM' or null for all
}
