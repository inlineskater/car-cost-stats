export type FuelType = 'lpg' | 'petrol'
export type CostCategory = 'inspection' | 'insurance' | 'service' | 'repair' | 'tax' | 'other'

export interface Database {
  public: {
    Tables: {
      fuel_entries: {
        Row: FuelEntryRow
        Insert: FuelEntryInsert
        Update: Partial<FuelEntryInsert>
        Relationships: []
      }
      other_costs: {
        Row: OtherCostRow
        Insert: OtherCostInsert
        Update: Partial<OtherCostInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      fuel_type: FuelType
      cost_category: CostCategory
    }
    CompositeTypes: Record<string, never>
  }
}

export interface FuelEntryRow {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  date: string
  fuel_type: FuelType
  liters: number
  price_per_liter: number
  total_cost: number
  mileage: number
  receipt_image_url: string | null
  odometer_image_url: string | null
  notes: string | null
  ai_parsed: boolean
}

export interface FuelEntryInsert {
  date: string
  fuel_type: FuelType
  liters: number
  price_per_liter: number
  total_cost: number
  mileage: number
  receipt_image_url?: string | null
  odometer_image_url?: string | null
  notes?: string | null
  ai_parsed?: boolean
}

export interface OtherCostRow {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  date: string
  category: CostCategory
  cost: number
  description: string
  next_due_date: string | null
  attachment_url: string | null
  notes: string | null
}

export interface OtherCostInsert {
  date: string
  category: CostCategory
  cost: number
  description: string
  next_due_date?: string | null
  attachment_url?: string | null
  notes?: string | null
}
