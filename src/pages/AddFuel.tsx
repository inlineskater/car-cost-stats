import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageIcon, Sparkles, PenLine, X } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import FuelForm, { type FuelFormData, type FuelFormPrefill } from '@/components/fuel/FuelForm'
import { useParseReceipt, type CapturedImage } from '@/hooks/useParseReceipt'
import { useAddFuelEntry } from '@/hooks/useFuelEntries'
import { useAppStore } from '@/stores/appStore'
import { compressImage } from '@/lib/utils'
import type { ParsedReceiptData } from '@/types'

type Phase = 'capture' | 'parsing' | 'confirm'

const MAX_IMPORT_IMAGES = 6

function roundTo(value: number, decimals: number): number {
  return Number(value.toFixed(decimals))
}

export default function AddFuel() {
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)

  const [phase, setPhase] = useState<Phase>('capture')
  const [images, setImages] = useState<CapturedImage[]>([])
  const [parsed, setParsed] = useState<ParsedReceiptData | null>(null)
  const [entryIndex, setEntryIndex] = useState(0)
  const [uploadedReceiptUrls, setUploadedReceiptUrls] = useState<Record<number, string>>({})
  const [uploadedOdometerUrl, setUploadedOdometerUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const galleryRef = useRef<HTMLInputElement>(null)

  const parseReceipt = useParseReceipt()
  const addFuelEntry = useAddFuelEntry()

  const totalEntries = parsed?.entries.length ?? 1

  function buildPrefill(p: ParsedReceiptData, idx: number): FuelFormPrefill {
    const entry = p.entries[idx] ?? {}
    return {
      date: p.date,
      mileage: p.mileage,
      fuel_type: entry.fuel_type ?? null,
      liters: entry.liters ?? null,
      price_per_liter: entry.price_per_liter ?? null,
      total_cost: entry.total_cost ?? null,
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? [])
    const remainingSlots = MAX_IMPORT_IMAGES - images.length
    const files = selectedFiles.slice(0, remainingSlots)
    if (!files.length) {
      e.target.value = ''
      return
    }
    if (selectedFiles.length > remainingSlots) {
      addToast(`Only ${MAX_IMPORT_IMAGES} photos can be imported at once.`, 'info')
    }
    setProcessing(true)
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)))
      const newImages: CapturedImage[] = compressed.map(({ file, base64, mimeType }) => ({
        file,
        base64,
        mimeType,
        preview: URL.createObjectURL(file),
      }))
      setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMPORT_IMAGES))
    } finally {
      setProcessing(false)
      e.target.value = ''
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const removed = prev[idx]
      if (removed) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function handleParseWithAI() {
    if (!images.length) return
    setPhase('parsing')
    try {
      const result = await parseReceipt.mutateAsync(images)
      setParsed(result)
      setEntryIndex(0)
      setUploadedReceiptUrls({})
      setUploadedOdometerUrl(null)
      if (result.confidence === 'low') {
        addToast('AI confidence is low — please check the values.', 'info')
      }
      if (result.entries.length > 1) {
        addToast(`${result.entries.length} fuel entries detected across photos.`, 'info')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addToast(`AI failed: ${msg}`, 'error')
    }
    setPhase('confirm')
  }

  function receiptImageIndexForCurrentEntry(): number | null {
    const parsedIndex = parsed?.entries[entryIndex]?.source_image_index
    if (parsedIndex != null && images[parsedIndex]) return parsedIndex
    return images.length ? 0 : null
  }

  function odometerImageIndexForCurrentImport(): number | null {
    const parsedIndex = parsed?.odometer_image_index
    if (parsedIndex != null && images[parsedIndex]) return parsedIndex
    return !parsed && images.length > 1 ? 1 : null
  }

  async function handleSubmit(data: FuelFormData) {
    const isLast = entryIndex >= totalEntries - 1
    const receiptImageIndex = receiptImageIndexForCurrentEntry()
    const odometerImageIndex = odometerImageIndexForCurrentImport()
    const receiptImageUrl = receiptImageIndex == null ? null : uploadedReceiptUrls[receiptImageIndex] ?? null
    try {
      const saved = await addFuelEntry.mutateAsync({
        entry: {
          date: data.date,
          fuel_type: data.fuel_type,
          liters: roundTo(data.liters, 3),
          price_per_liter: roundTo(data.price_per_liter, 4),
          total_cost: roundTo(data.total_cost, 2),
          mileage: data.mileage,
          notes: data.notes || null,
          ai_parsed: parsed !== null,
          receipt_image_url: receiptImageUrl,
          odometer_image_url: uploadedOdometerUrl,
        },
        receiptFile: receiptImageIndex != null && !receiptImageUrl ? images[receiptImageIndex]?.file : undefined,
        odometerFile: odometerImageIndex != null && !uploadedOdometerUrl ? images[odometerImageIndex]?.file : undefined,
      })

      if (receiptImageIndex != null && saved.receipt_image_url) {
        setUploadedReceiptUrls((prev) => ({ ...prev, [receiptImageIndex]: saved.receipt_image_url }))
      }
      if (odometerImageIndex != null && saved.odometer_image_url) {
        setUploadedOdometerUrl(saved.odometer_image_url)
      }

      if (isLast) {
        addToast('Fuel entry saved!', 'success')
        navigate('/')
      } else {
        addToast('Entry saved — confirm the next fuel type.', 'success')
        setEntryIndex((i) => i + 1)
      }
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
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={img.preview}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-xl border border-slate-700"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-slate-900/80 rounded-full p-1 text-slate-300 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                    <p className="text-[11px] text-slate-400 mt-1 text-center">
                      Photo {idx + 1}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {images.length < MAX_IMPORT_IMAGES && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400 text-center">
                  {images.length === 0
                    ? `Add up to ${MAX_IMPORT_IMAGES} photos (receipts + odometer)`
                    : `${images.length} of ${MAX_IMPORT_IMAGES} photos added`}
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
                    <span className="text-[11px] text-slate-500">
                      choose up to {MAX_IMPORT_IMAGES - images.length} more
                    </span>
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
            <p className="text-slate-500 text-sm text-center">Several photos can take a little longer</p>
          </div>
        )}

        {phase === 'confirm' && (
          <>
            {parsed && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={parsed.confidence === 'high' ? 'success' : parsed.confidence === 'medium' ? 'warning' : 'danger'}>
                  AI {parsed.confidence} confidence
                </Badge>
                {totalEntries > 1 && (
                  <Badge variant="info">
                    Entry {entryIndex + 1} of {totalEntries}
                  </Badge>
                )}
                {parsed.parsing_notes && (
                  <p className="text-xs text-slate-400 flex-1">{parsed.parsing_notes}</p>
                )}
              </div>
            )}
            <FuelForm
              key={entryIndex}
              prefilled={parsed ? buildPrefill(parsed, entryIndex) : null}
              onSubmit={handleSubmit}
              submitting={addFuelEntry.isPending}
            />
          </>
        )}
      </div>
    </div>
  )
}
