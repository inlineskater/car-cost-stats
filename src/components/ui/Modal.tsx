import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  // portal to <body> so a sticky/blurred/scrolling ancestor can't clip or
  // re-anchor the fixed overlay
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(15,15,15,0.4)]" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-xl sm:rounded-lg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] z-10 max-h-[90vh] overflow-y-auto shadow-pop">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button onClick={onClose} className="text-ink-faint hover:text-ink p-1 rounded hover:bg-surface-hover">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
