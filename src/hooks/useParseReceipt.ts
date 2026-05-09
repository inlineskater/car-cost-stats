import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ParsedReceiptData } from '@/types'

export interface CapturedImage {
  file: File
  base64: string
  mimeType: string
  preview: string
}

export function useParseReceipt() {
  return useMutation({
    mutationFn: async (images: CapturedImage[]): Promise<ParsedReceiptData> => {
      const { data, error } = await supabase.functions.invoke<ParsedReceiptData>('parse-receipt', {
        body: {
          images: images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
        },
      })
      if (error) {
        // Try to get the actual error body from the edge function response
        let detail = error.message
        try {
          const body = await (error as unknown as { context: Response }).context.json()
          detail = body?.error ?? body?.detail ?? error.message
        } catch { /* ignore parse error */ }
        throw new Error(detail)
      }
      if (!data) throw new Error('No data returned from AI')
      return data
    },
  })
}
