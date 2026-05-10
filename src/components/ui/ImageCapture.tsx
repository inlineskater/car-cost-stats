import { Camera, ImageIcon, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { compressImage } from '@/lib/utils'
import Spinner from './Spinner'

interface ImageCaptureProps {
  label: string
  onImageSelected: (file: File, base64: string, mimeType: string) => void
  preview?: string | null
  onClear?: () => void
}

export default function ImageCapture({ label, onImageSelected, preview, onClear }: ImageCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setProcessing(true)
    try {
      const { file: compressed, base64, mimeType } = await compressImage(file)
      onImageSelected(compressed, base64, mimeType)
    } finally {
      setProcessing(false)
      e.target.value = ''
    }
  }

  if (preview) {
    return (
      <div className="relative">
        <img src={preview} alt={label} className="w-full h-40 object-cover rounded-xl border border-gray-200" />
        <button
          onClick={onClear}
          className="absolute top-2 right-2 bg-white/90 rounded-full p-1 text-gray-500 hover:text-gray-800"
        >
          <X size={16} />
        </button>
        <p className="text-xs text-gray-500 mt-1 text-center">{label}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {processing ? (
        <div className="flex items-center justify-center h-32 bg-gray-100 rounded-xl border border-dashed border-gray-300">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-28 bg-gray-100 border border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors active:scale-95"
          >
            <Camera size={22} />
            <span className="text-xs">Camera</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-28 bg-gray-100 border border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors active:scale-95"
          >
            <ImageIcon size={22} />
            <span className="text-xs">Gallery</span>
          </button>
        </div>
      )}
      {/* Camera input — opens rear camera on mobile */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      {/* Gallery input — opens photo picker */}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
