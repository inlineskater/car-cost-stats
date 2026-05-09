import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FuelEntryRow, FuelEntryInsert, FuelType } from '@/types'

const KEY = 'fuel_entries'

interface FuelFilters {
  fuelType?: FuelType | 'all'
  month?: string | null   // 'YYYY-MM'
}

export function useFuelEntries(filters?: FuelFilters) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('fuel_entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters?.fuelType && filters.fuelType !== 'all') {
        q = q.eq('fuel_type', filters.fuelType)
      }
      if (filters?.month) {
        const [y, m] = filters.month.split('-')
        const start = `${y}-${m}-01`
        const end = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10)
        q = q.gte('date', start).lte('date', end)
      }

      const { data, error } = await q
      if (error) throw error
      return data as FuelEntryRow[]
    },
  })
}

export function useAllFuelEntries() {
  return useQuery({
    queryKey: [KEY, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_entries')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as FuelEntryRow[]
    },
    staleTime: 120_000,
  })
}

interface AddFuelParams {
  entry: FuelEntryInsert
  receiptFile?: File
  odometerFile?: File
}

export function useAddFuelEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ entry, receiptFile, odometerFile }: AddFuelParams) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let receipt_image_url: string | null = null
      let odometer_image_url: string | null = null

      if (receiptFile) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('receipts').upload(path, receiptFile)
        if (!error) {
          const { data } = supabase.storage.from('receipts').getPublicUrl(path)
          receipt_image_url = data.publicUrl
        }
      }
      if (odometerFile) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('odometers').upload(path, odometerFile)
        if (!error) {
          const { data } = supabase.storage.from('odometers').getPublicUrl(path)
          odometer_image_url = data.publicUrl
        }
      }

      const { data, error } = await supabase
        .from('fuel_entries')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...entry, receipt_image_url, odometer_image_url } as any)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export function useDeleteFuelEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fuel_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
