import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { ConsumptionPoint } from '@/types'
import { formatDate } from '@/lib/utils'

interface ConsumptionLineChartProps {
  data: ConsumptionPoint[]
}

export default function ConsumptionLineChart({ data }: ConsumptionLineChartProps) {
  if (data.length < 2) {
    return <p className="text-center text-slate-500 text-sm py-8">Need at least 2 fill-ups to show consumption</p>
  }

  const chartData = data.map((p) => ({
    date: formatDate(p.date),
    LPG: p.fuelType === 'lpg' ? p.lPer100km : null,
    Petrol: p.fuelType === 'petrol' ? p.lPer100km : null,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} unit=" L" />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
          formatter={(v: number) => `${v.toFixed(2)} L/100km`}
        />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        <Line type="monotone" dataKey="LPG" stroke="#22c55e" dot={false} connectNulls />
        <Line type="monotone" dataKey="Petrol" stroke="#3b82f6" dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
