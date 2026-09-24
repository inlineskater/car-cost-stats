import { cn } from '@/lib/utils'
import type { FuelType } from '@/types'

interface FuelTypeToggleProps {
  value: FuelType
  onChange: (v: FuelType) => void
}

export default function FuelTypeToggle({ value, onChange }: FuelTypeToggleProps) {
  return (
    <div className="flex bg-surface-sidebar rounded-md p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange('lpg')}
        className={cn(
          'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors',
          value === 'lpg'
            ? 'bg-lpg text-white'
            : 'text-ink-muted hover:text-ink',
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
            ? 'bg-accent text-white'
            : 'text-ink-muted hover:text-ink',
        )}
      >
        Petrol
      </button>
    </div>
  )
}
