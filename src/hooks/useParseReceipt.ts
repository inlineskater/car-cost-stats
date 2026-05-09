import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ParsedFuelEntry, ParsedReceiptData } from '@/types'

export interface CapturedImage {
  file: File
  base64: string
  mimeType: string
  preview: string
}

type RawParsedReceiptData = Partial<ParsedReceiptData> & Partial<ParsedFuelEntry>

function roundTo(value: unknown, decimals: number): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Number(n.toFixed(decimals))
}

function roundMileage(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n) : null
}

function normalizeParsedReceipt(data: RawParsedReceiptData): ParsedReceiptData {
  const hasLegacyEntry =
    data.fuel_type != null ||
    data.liters != null ||
    data.price_per_liter != null ||
    data.total_cost != null
  const entries = Array.isArray(data.entries)
    ? data.entries
    : hasLegacyEntry
      ? [{
          fuel_type: data.fuel_type ?? null,
          liters: data.liters ?? null,
          price_per_liter: data.price_per_liter ?? null,
          total_cost: data.total_cost ?? null,
        }]
      : []
  const confidence = data.confidence === 'high' || data.confidence === 'medium' || data.confidence === 'low'
    ? data.confidence
    : 'low'

  return {
    date: data.date ?? null,
    mileage: roundMileage(data.mileage),
    confidence,
    parsing_notes: data.parsing_notes ?? '',
    entries: entries.map((entry) => ({
      fuel_type: entry.fuel_type === 'lpg' || entry.fuel_type === 'petrol' ? entry.fuel_type : null,
      liters: roundTo(entry.liters, 3),
      price_per_liter: roundTo(entry.price_per_liter, 4),
      total_cost: roundTo(entry.total_cost, 2),
    })),
  }
}

export function useParseReceipt() {
  return useMutation({
    mutationFn: async (images: CapturedImage[]): Promise<ParsedReceiptData> => {
      const { data, error } = await supabase.functions.invoke<RawParsedReceiptData>('parse-receipt', {
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
      return normalizeParsedReceipt(data)
    },
  })
}
