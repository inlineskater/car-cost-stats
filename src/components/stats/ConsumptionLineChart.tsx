import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { ConsumptionPoint } from '@/types'

interface ConsumptionLineChartProps {
  data: ConsumptionPoint[]
  avgLpg: number | null
  avgPetrol: number | null
}

export default function ConsumptionLineChart({ data, avgLpg, avgPetrol }: ConsumptionLineChartProps) {
  const months = [...new Set(data.map((p) => p.date.substring(0, 7)))].sort()

  if (months.length < 2) {
    return <p className="text-center text-gray-400 text-sm py-6">Need at least 2 months of data</p>
  }

  const chartData = months.map((month) => {
    const lpg = data.find((p) => p.fuelType === 'lpg' && p.date.startsWith(month))
    const petrol = data.find((p) => p.fuelType === 'petrol' && p.date.startsWith(month))
    return {
      date: format(parseISO(`${month}-01`), 'MMM yy'),
      lpg: lpg?.lPer100km ?? null,
      petrol: petrol?.lPer100km ?? null,
    }
  })

  const hasLpg = avgLpg !== null
  const hasPetrol = avgPetrol !== null

  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} unit=" L" />
          <Tooltip
            contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}
            formatter={(v: number) => [`${v.toFixed(2)} L/100km`]}
          />
          <Legend wrapperStyle={{ color: '#6B7280', fontSize: 12 }} />
          {hasLpg && (
            <Line
              type="monotone"
              dataKey="lpg"
              name="LPG"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}
          {hasPetrol && (
            <Line
              type="monotone"
              dataKey="petrol"
              name="Petrol"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-1 text-xs">
        {avgLpg !== null && <p className="text-green-500">Avg LPG: {avgLpg} L/100km</p>}
        {avgPetrol !== null && <p className="text-blue-500">Avg Petrol: {avgPetrol} L/100km</p>}
      </div>
    </>
  )
}
