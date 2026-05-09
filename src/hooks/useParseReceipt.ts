import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ParsedReceiptData } from '@/types'

interface ParseInput {
  receiptFile?: { base64: string; mimeType: string } | null
  odometerFile?: { base64: string; mimeType: string } | null
}

export function useParseReceipt() {
  return useMutation({
    mutationFn: async ({ receiptFile, odometerFile }: ParseInput): Promise<ParsedReceiptData> => {
      const payload: Record<string, string> = {}
      if (receiptFile) {
        payload.receiptImageBase64 = receiptFile.base64
        payload.receiptMimeType = receiptFile.mimeType
      }
      if (odometerFile) {
        payload.odometerImageBase64 = odometerFile.base64
        payload.odometerMimeType = odometerFile.mimeType
      }

      const { data, error } = await supabase.functions.invoke<ParsedReceiptData>('parse-receipt', {
        body: payload,
      })

      if (error) throw new Error(error.message)
      if (!data) throw new Error('No data returned from AI')
      return data
    },
  })
}
