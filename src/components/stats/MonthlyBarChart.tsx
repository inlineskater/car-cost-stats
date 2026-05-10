import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList,
} from 'recharts'
import type { MonthlyBreakdown } from '@/types'

interface MonthlyBarChartProps {
  data: MonthlyBreakdown[]
}

export default function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const chartData = data.map((m) => ({ ...m, _total: m.total }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          itemStyle={{ color: '#6B7280' }}
          formatter={(v: number) => `${v.toFixed(0)} zł`}
        />
        <Legend wrapperStyle={{ color: '#6B7280', fontSize: 11 }} />
        <Bar dataKey="lpgCost" name="LPG" stackId="a" fill="#22c55e" />
        <Bar dataKey="petrolCost" name="Petrol" stackId="a" fill="#3b82f6" />
        <Bar dataKey="otherCost" name="Other" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="_total" position="top" fill="#6B7280" fontSize={10} formatter={(v: number) => v > 0 ? v.toFixed(0) : ''} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
