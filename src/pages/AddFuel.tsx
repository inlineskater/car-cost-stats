import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, PenLine } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import ImageCapture from '@/components/ui/ImageCapture'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import FuelForm, { type FuelFormData } from '@/components/fuel/FuelForm'
import { useParseReceipt } from '@/hooks/useParseReceipt'
import { useAddFuelEntry } from '@/hooks/useFuelEntries'
import { useAppStore } from '@/stores/appStore'
import type { ParsedReceiptData } from '@/types'

type Phase = 'capture' | 'parsing' | 'confirm'

interface CapturedImage {
  file: File
  base64: string
  mimeType: string
  preview: string
}

export default function AddFuel() {
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)

  const [phase, setPhase] = useState<Phase>('capture')
  const [receipt, setReceipt] = useState<CapturedImage | null>(null)
  const [odometer, setOdometer] = useState<CapturedImage | null>(null)
  const [parsed, setParsed] = useState<ParsedReceiptData | null>(null)

  const parseReceipt = useParseReceipt()
  const addFuelEntry = useAddFuelEntry()

  function handleReceiptSelected(file: File, base64: string, mimeType: string) {
    setReceipt({ file, base64, mimeType, preview: URL.createObjectURL(file) })
  }
  function handleOdometerSelected(file: File, base64: string, mimeType: string) {
    setOdometer({ file, base64, mimeType, preview: URL.createObjectURL(file) })
  }

  async function handleParseWithAI() {
    if (!receipt && !odometer) return
    setPhase('parsing')
    try {
      const result = await parseReceipt.mutateAsync({
        receiptFile: receipt ? { base64: receipt.base64, mimeType: receipt.mimeType } : null,
        odometerFile: odometer ? { base64: odometer.base64, mimeType: odometer.mimeType } : null,
      })
      setParsed(result)
      if (result.confidence === 'low') {
        addToast('AI couldn\'t read the images clearly — please fill in manually.', 'info')
      }
    } catch {
      addToast('AI parsing failed — please fill in manually.', 'error')
    }
    setPhase('confirm')
  }

  async function handleSubmit(data: FuelFormData) {
    try {
      await addFuelEntry.mutateAsync({
        entry: {
          date: data.date,
          fuel_type: data.fuel_type,
          liters: data.liters,
          price_per_liter: data.price_per_liter,
          total_cost: data.total_cost,
          mileage: data.mileage,
          notes: data.notes || null,
          ai_parsed: parsed !== null,
        },
        receiptFile: receipt?.file,
        odometerFile: odometer?.file,
      })
      addToast('Fuel entry saved!', 'success')
      navigate('/')
    } catch (err) {
      addToast('Failed to save entry.', 'error')
    }
  }

  return (
    <div>
      <TopBar title="Add Fuel" />
      <div className="p-4 space-y-5 max-w-lg mx-auto">

        {phase === 'capture' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ImageCapture
                label="Receipt"
                onImageSelected={handleReceiptSelected}
                preview={receipt?.preview}
                onClear={() => setReceipt(null)}
              />
              <ImageCapture
                label="Odometer"
                onImageSelected={handleOdometerSelected}
                preview={odometer?.preview}
                onClear={() => setOdometer(null)}
              />
            </div>

            <button
              onClick={handleParseWithAI}
              disabled={!receipt && !odometer}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <Sparkles size={18} />
              Parse with AI
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <button
              onClick={() => setPhase('confirm')}
              className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 rounded-xl transition-colors"
            >
              <PenLine size={18} />
              Enter manually
            </button>
          </>
        )}

        {phase === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Spinner className="w-10 h-10" />
            <p className="text-slate-300 font-medium">Reading your receipt…</p>
            <p className="text-slate-500 text-sm text-center">This usually takes 3–5 seconds</p>
          </div>
        )}

        {phase === 'confirm' && (
          <>
            {parsed && (
              <div className="flex items-center gap-2">
                <Badge variant={parsed.confidence === 'high' ? 'success' : parsed.confidence === 'medium' ? 'warning' : 'danger'}>
                  AI {parsed.confidence} confidence
                </Badge>
                {parsed.parsing_notes && (
                  <p className="text-xs text-slate-400 truncate flex-1">{parsed.parsing_notes}</p>
                )}
              </div>
            )}
            <FuelForm
              prefilled={parsed}
              onSubmit={handleSubmit}
              submitting={addFuelEntry.isPending}
            />
          </>
        )}
      </div>
    </div>
  )
}
