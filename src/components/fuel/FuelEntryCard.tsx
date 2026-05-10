import { Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { FuelEntryRow } from '@/types'
import { formatCurrency, formatDate, formatLiters, formatKm } from '@/lib/utils'

interface FuelEntryCardProps {
  entry: FuelEntryRow
  onDelete?: (id: string) => void
}

export default function FuelEntryCard({ entry, onDelete }: FuelEntryCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={entry.fuel_type === 'lpg' ? 'lpg' : 'petrol'}>
              {entry.fuel_type.toUpperCase()}
            </Badge>
            {entry.ai_parsed && (
              <Badge variant="neutral" className="text-[10px]">AI</Badge>
            )}
            <span className="text-xs text-gray-400 ml-auto">{formatDate(entry.date)}</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(entry.total_cost)}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatLiters(entry.liters)} · {(entry.total_cost / entry.liters).toFixed(4)}/L · {formatKm(entry.mileage)}
          </p>
          {entry.notes && <p className="text-xs text-gray-400 mt-1 truncate">{entry.notes}</p>}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(entry.id)}
            className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
