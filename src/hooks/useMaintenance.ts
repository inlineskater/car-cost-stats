import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { serviceTypeLabel, renewalCategoryLabel } from '@/lib/maintenance'
import { useAllFuelEntries } from './useFuelEntries'
import type {
  MaintenanceRecordRow,
  MaintenanceRecordInsert,
  MaintenanceStatus,
  RenewalRow,
  RenewalInsert,
  RenewalStatus,
  ReminderStatus,
} from '@/types'

const KEY = 'maintenance_records'
const RENEWALS_KEY = 'renewals'

// km remaining at/below which a km-based service is considered "due soon"
const DUE_SOON_KM = 1000
// days remaining at/below which a date-based renewal is considered "due soon"
const DUE_SOON_DAYS = 30

export function useAllMaintenanceRecords() {
  return useQuery({
    queryKey: [KEY, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return data as MaintenanceRecordRow[]
    },
    staleTime: 120_000,
  })
}

export function useAddMaintenanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: MaintenanceRecordInsert) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('maintenance_records')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(record as any)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteMaintenanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('maintenance_records').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

// Derived per-service-type status (km-based). The latest record per type
// (highest odometer) defines the active interval; "current odometer" is the
// max mileage across fuel entries.
export function useMaintenanceStatus(): { data: MaintenanceStatus[]; currentOdometer: number; isLoading: boolean } {
  const { data: records, isLoading: rl } = useAllMaintenanceRecords()
  const { data: fuel, isLoading: fl } = useAllFuelEntries()

  const result = useMemo(() => {
    const mileages = (fuel ?? []).map((e) => e.mileage).filter(Boolean)
    const currentOdometer = mileages.length ? Math.max(...mileages) : 0

    const latestByType = new Map<string, MaintenanceRecordRow>()
    for (const r of records ?? []) {
      const existing = latestByType.get(r.service_type)
      if (!existing || r.odometer_km > existing.odometer_km) {
        latestByType.set(r.service_type, r)
      }
    }

    const data: MaintenanceStatus[] = [...latestByType.values()].map((r) => {
      const nextDueKm = r.odometer_km + r.interval_km
      const kmRemaining = nextDueKm - currentOdometer
      const status: ReminderStatus =
        kmRemaining <= 0 ? 'overdue' : kmRemaining <= DUE_SOON_KM ? 'due_soon' : 'ok'
      return {
        serviceType: r.service_type,
        label: serviceTypeLabel(r.service_type),
        lastOdometer: r.odometer_km,
        lastDate: r.date,
        intervalKm: r.interval_km,
        nextDueKm,
        kmRemaining,
        status,
      }
    })

    data.sort((a, b) => a.kmRemaining - b.kmRemaining)
    return { data, currentOdometer }
  }, [records, fuel])

  return { ...result, isLoading: rl || fl }
}

// ---- Date-based renewals (OC insurance, przegląd inspection) ----------------

export function useRenewals() {
  return useQuery({
    queryKey: [RENEWALS_KEY, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renewals')
        .select('*')
        .order('valid_until', { ascending: true })
      if (error) throw error
      return data as RenewalRow[]
    },
    staleTime: 120_000,
  })
}

export function useAddRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (renewal: RenewalInsert) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('renewals')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(renewal as any)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RENEWALS_KEY] }),
  })
}

export function useDeleteRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('renewals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RENEWALS_KEY] }),
  })
}

// Derived status: latest valid_until per category. Always returned regardless
// of how far out the date is, so the date is always visible.
export function useRenewalStatus(): { data: RenewalStatus[]; isLoading: boolean } {
  const { data: renewals, isLoading } = useRenewals()

  const data = useMemo(() => {
    if (!renewals) return []
    const today = new Date()

    const latestByCategory = new Map<string, RenewalRow>()
    for (const r of renewals) {
      const existing = latestByCategory.get(r.category)
      if (!existing || r.valid_until > existing.valid_until) {
        latestByCategory.set(r.category, r)
      }
    }

    const out: RenewalStatus[] = [...latestByCategory.values()].map((r) => {
      const daysRemaining = differenceInDays(parseISO(r.valid_until), today)
      const status: ReminderStatus =
        daysRemaining < 0 ? 'overdue' : daysRemaining <= DUE_SOON_DAYS ? 'due_soon' : 'ok'
      return {
        id: r.id,
        category: r.category,
        label: renewalCategoryLabel(r.category),
        validUntil: r.valid_until,
        daysRemaining,
        status,
      }
    })
    return out.sort((a, b) => a.daysRemaining - b.daysRemaining)
  }, [renewals])

  return { data, isLoading }
}
