import { cn } from '@/lib/utils'
import type { FuelType } from '@/types'

interface FuelTypeToggleProps {
  value: FuelType
  onChange: (v: FuelType) => void
}

export default function FuelTypeToggle({ value, onChange }: FuelTypeToggleProps) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange('lpg')}
        className={cn(
          'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors',
          value === 'lpg'
            ? 'bg-green-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
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
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        Petrol
      </button>
    </div>
  )
}
