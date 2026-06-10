import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useAppStore, DEFAULT_AMORT_MONTHS, type AmortMonths } from '@/stores/appStore'

const FIELDS: { key: keyof AmortMonths; label: string; hint: string }[] = [
  { key: 'insurance', label: 'Insurance (OC)', hint: 'e.g. 12 for a yearly policy' },
  { key: 'inspection', label: 'Inspection (przegląd)', hint: 'e.g. 12 for a yearly check' },
  { key: 'service', label: 'Service & repairs', hint: 'spread big repairs over N months' },
  { key: 'other', label: 'Other & tax', hint: 'misc one-off costs' },
]

// Lets the user choose, per category, how many months each cost is spread
// across in the amortized charts.
export default function AmortSettings() {
  const [open, setOpen] = useState(false)
  const amortMonths = useAppStore((s) => s.amortMonths)
  const setAmortMonths = useAppStore((s) => s.setAmortMonths)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Amortization settings"
        className="text-gray-400 hover:text-gray-700 transition-colors p-1"
      >
        <Settings2 size={15} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Amortization period">
        <p className="text-sm text-gray-500 mb-4">
          How many months each cost is spread across in the amortized view.
        </p>
        <div className="space-y-3">
          {FIELDS.map(({ key, label, hint }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={amortMonths[key]}
                  onChange={(e) => setAmortMonths({ [key]: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-16 bg-gray-100 border-0 rounded-xl px-3 py-2 text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
                <span className="text-xs text-gray-400">mo</span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setAmortMonths(DEFAULT_AMORT_MONTHS)}
          className="mt-4 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          Reset to defaults (12 months)
        </button>
      </Modal>
    </>
  )
}
