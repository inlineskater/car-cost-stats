import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageIcon, Sparkles, PenLine, X } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import FuelForm, { type FuelFormData } from '@/components/fuel/FuelForm'
import { useParseReceipt, type CapturedImage } from '@/hooks/useParseReceipt'
import { useAddFuelEntry } from '@/hooks/useFuelEntries'
import { useAppStore } from '@/stores/appStore'
import { compressImage } from '@/lib/utils'
import type { ParsedReceiptData } from '@/types'

type Phase = 'capture' | 'parsing' | 'confirm'

export default function AddFuel() {
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)

  const [phase, setPhase] = useState<Phase>('capture')
  const [images, setImages] = useState<CapturedImage[]>([])
  const [parsed, setParsed] = useState<ParsedReceiptData | null>(null)
  const [processing, setProcessing] = useState(false)

  const galleryRef = useRef<HTMLInputElement>(null)

  const parseReceipt = useParseReceipt()
  const addFuelEntry = useAddFuelEntry()

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 2 - images.length)
    if (!files.length) return
    setProcessing(true)
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)))
      const newImages: CapturedImage[] = compressed.map(({ file, base64, mimeType }) => ({
        file,
        base64,
        mimeType,
        preview: URL.createObjectURL(file),
      }))
      setImages((prev) => [...prev, ...newImages].slice(0, 2))
    } finally {
      setProcessing(false)
      e.target.value = ''
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleParseWithAI() {
    if (!images.length) return
    setPhase('parsing')
    try {
      const result = await parseReceipt.mutateAsync(images)
      setParsed(result)
      if (result.confidence === 'low') {
        addToast('AI confidence is low — please check the values.', 'info')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addToast(`AI failed: ${msg}`, 'error')
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
        receiptFile: images[0]?.file,
        odometerFile: images[1]?.file,
      })
      addToast('Fuel entry saved!', 'success')
      navigate('/')
    } catch {
      addToast('Failed to save entry.', 'error')
    }
  }

  return (
    <div>
      <TopBar title="Add Fuel" />
      <div className="p-4 space-y-5 max-w-lg mx-auto">

        {phase === 'capture' && (
          <>
            {/* Selected image thumbnails */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={img.preview}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-36 object-cover rounded-xl border border-slate-700"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-slate-900/80 rounded-full p-1 text-slate-300 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                    <p className="text-[11px] text-slate-400 mt-1 text-center">
                      {idx === 0 ? 'Photo 1' : 'Photo 2'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add photo buttons — hidden once 2 photos selected */}
            {images.length < 2 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400 text-center">
                  {images.length === 0
                    ? 'Add up to 2 photos (receipt + odometer)'
                    : '1 photo added — add a second if you have one'}
                </p>

                {processing ? (
                  <div className="flex items-center justify-center h-28 bg-slate-800 rounded-xl border border-dashed border-slate-600">
                    <Spinner />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 h-28 bg-slate-800 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-colors active:scale-95"
                  >
                    <ImageIcon size={28} />
                    <span className="text-sm font-medium">Select photos</span>
                    <span className="text-[11px] text-slate-500">choose up to 2 at once</span>
                  </button>
                )}

                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFiles}
                />
              </div>
            )}

            {/* Action buttons */}
            <button
              onClick={handleParseWithAI}
              disabled={images.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold py-3 rounded-xl transition-colors"
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
            <p className="text-slate-300 font-medium">Reading your photos…</p>
            <p className="text-slate-500 text-sm text-center">Usually takes 3–5 seconds</p>
          </div>
        )}

        {phase === 'confirm' && (
          <>
            {parsed && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={parsed.confidence === 'high' ? 'success' : parsed.confidence === 'medium' ? 'warning' : 'danger'}>
                  AI {parsed.confidence} confidence
                </Badge>
                {parsed.parsing_notes && (
                  <p className="text-xs text-slate-400 flex-1">{parsed.parsing_notes}</p>
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
