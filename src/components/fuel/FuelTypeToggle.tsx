import { cn } from '@/lib/utils'
import type { FuelType } from '@/types'

interface FuelTypeToggleProps {
  value: FuelType
  onChange: (v: FuelType) => void
}

export default function FuelTypeToggle({ value, onChange }: FuelTypeToggleProps) {
  return (
    <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange('lpg')}
        className={cn(
          'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors',
          value === 'lpg'
            ? 'bg-green-600 text-white'
            : 'text-slate-400 hover:text-slate-200',
        )}
      >
        LPG
      </button>
      <button
        type="button"
        onClick={() => onChange('petrol')}
        className={cn(
          'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors',
          value === 'petrol'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-slate-200',
        )}
      >
        Petrol
      </button>
    </div>
  )
}
