import { create } from 'zustand'
import type { HistoryFilters } from '@/types'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppState {
  historyFilters: HistoryFilters
  toasts: Toast[]
  setHistoryFilters: (filters: Partial<HistoryFilters>) => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  historyFilters: { fuelType: 'all', month: null },
  toasts: [],

  setHistoryFilters: (filters) =>
    set((s) => ({ historyFilters: { ...s.historyFilters, ...filters } })),

  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
