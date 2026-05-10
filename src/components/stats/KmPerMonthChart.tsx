import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { MonthlyBreakdown } from '@/types'

interface KmPerMonthChartProps {
  data: MonthlyBreakdown[]
}

export default function KmPerMonthChart({ data }: KmPerMonthChartProps) {
  const chartData = data.filter((d) => d.kmDriven !== null && d.kmDriven > 0)
  if (chartData.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} unit=" km" />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}
          formatter={(v: number) => [`${v.toLocaleString()} km`]}
        />
        <Bar dataKey="kmDriven" name="km" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
