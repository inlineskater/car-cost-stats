import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { ConsumptionPoint } from '@/types'
import { formatDate } from '@/lib/utils'

interface ConsumptionLineChartProps {
  data: ConsumptionPoint[]
  fuelType: 'lpg' | 'petrol'
  avg: number | null
}

const COLOR = { lpg: '#22c55e', petrol: '#3b82f6' }
const LABEL = { lpg: 'LPG', petrol: 'Petrol' }

export default function ConsumptionLineChart({ data, fuelType, avg }: ConsumptionLineChartProps) {
  const filtered = data.filter((p) => p.fuelType === fuelType)

  if (filtered.length < 2) {
    return <p className="text-center text-slate-500 text-sm py-6">Need at least 2 {LABEL[fuelType]} fill-ups</p>
  }

  const color = COLOR[fuelType]
  const chartData = filtered.map((p) => ({ date: formatDate(p.date), value: p.lPer100km }))
  const isPetrol = fuelType === 'petrol'

  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: color, fontSize: 11 }} tickLine={false} axisLine={false} unit=" L" />
          <Tooltip
            contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}
            formatter={(v: number) => [`${v.toFixed(2)} L/100km`, LABEL[fuelType]]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={isPetrol ? { r: 4, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      {avg !== null && (
        <p className="text-xs mt-1" style={{ color }}>
          Avg {LABEL[fuelType]}: {avg} L/100km
        </p>
      )}
    </>
  )
}
