import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OtherCostRow, OtherCostInsert } from '@/types'

const KEY = 'other_costs'

export function useOtherCosts(month?: string | null) {
  return useQuery({
    queryKey: [KEY, month],
    queryFn: async () => {
      let q = supabase
        .from('other_costs')
        .select('*')
        .order('date', { ascending: false })

      if (month) {
        const [y, m] = month.split('-')
        const start = `${y}-${m}-01`
        const end = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10)
        q = q.gte('date', start).lte('date', end)
      }

      const { data, error } = await q
      if (error) throw error
      return data as OtherCostRow[]
    },
  })
}

export function useAllOtherCosts() {
  return useQuery({
    queryKey: [KEY, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('other_costs')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return data as OtherCostRow[]
    },
    staleTime: 120_000,
  })
}

interface AddCostParams {
  cost: OtherCostInsert
  attachmentFile?: File
}

export function useAddOtherCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ cost, attachmentFile }: AddCostParams) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let attachment_url: string | null = null
      if (attachmentFile) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('attachments').upload(path, attachmentFile)
        if (!error) {
          const { data } = supabase.storage.from('attachments').getPublicUrl(path)
          attachment_url = data.publicUrl
        }
      }

      const { data, error } = await supabase
        .from('other_costs')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...cost, attachment_url } as any)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteOtherCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('other_costs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
