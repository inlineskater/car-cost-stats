import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HistoryFilters } from '@/types'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// number of months each cost category is amortized (spread) across in charts
export interface AmortMonths {
  insurance: number   // OC
  inspection: number  // przegląd
  service: number     // service + repair
  other: number       // other + tax
}

export const DEFAULT_AMORT_MONTHS: AmortMonths = { insurance: 12, inspection: 12, service: 12, other: 12 }

interface AppState {
  historyFilters: HistoryFilters
  toasts: Toast[]
  amortMonths: AmortMonths
  setHistoryFilters: (filters: Partial<HistoryFilters>) => void
  setAmortMonths: (months: Partial<AmortMonths>) => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useAppStore = create<AppState>()(persist((set) => ({
  historyFilters: { fuelType: 'all', month: null },
  toasts: [],
  amortMonths: DEFAULT_AMORT_MONTHS,

  setHistoryFilters: (filters) =>
    set((s) => ({ historyFilters: { ...s.historyFilters, ...filters } })),

  setAmortMonths: (months) =>
    set((s) => ({ amortMonths: { ...s.amortMonths, ...months } })),

  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}), {
  name: 'car-cost-app',
  partialize: (s) => ({ amortMonths: s.amortMonths }),
}))
