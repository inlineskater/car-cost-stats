import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

const icons = {
  success: <CheckCircle size={18} className="text-[#448361] shrink-0" />,
  error: <XCircle size={18} className="text-[#d44c47] shrink-0" />,
  info: <Info size={18} className="text-accent shrink-0" />,
}

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore()

  return (
    <div className="fixed bottom-20 md:bottom-6 left-0 right-0 md:left-60 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 w-full max-w-sm bg-white border border-line',
            'rounded-md px-3 py-2.5 shadow-pop border-0 pointer-events-auto',
          )}
        >
          {icons[t.type]}
          <p className="text-sm text-ink flex-1">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="text-ink-faint hover:text-ink-muted">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
