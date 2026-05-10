import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, parseISO } from 'date-fns'
import { useAllFuelEntries } from '@/hooks/useFuelEntries'

export default function PriceTrendChart() {
  const { data: fuel } = useAllFuelEntries()

  const chartData = useMemo(() => {
    if (!fuel) return []
    const byMonth = new Map<string, { lpgSum: number; lpgCount: number; petrolSum: number; petrolCount: number }>()
    for (const e of fuel) {
      const month = e.date.substring(0, 7)
      const entry = byMonth.get(month) ?? { lpgSum: 0, lpgCount: 0, petrolSum: 0, petrolCount: 0 }
      if (e.fuel_type === 'lpg') { entry.lpgSum += Number(e.price_per_liter); entry.lpgCount++ }
      else { entry.petrolSum += Number(e.price_per_liter); entry.petrolCount++ }
      byMonth.set(month, entry)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        date: format(parseISO(`${month}-01`), 'MMM'),
        LPG: d.lpgCount > 0 ? +(d.lpgSum / d.lpgCount).toFixed(4) : null,
        Petrol: d.petrolCount > 0 ? +(d.petrolSum / d.petrolCount).toFixed(4) : null,
      }))
  }, [fuel])

  if (chartData.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} unit=" zł" />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}
          formatter={(v: number) => [`${v.toFixed(4)} zł/L`]}
        />
        <Legend wrapperStyle={{ color: '#6B7280', fontSize: 12 }} />
        <Line type="monotone" dataKey="LPG" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} connectNulls />
        <Line type="monotone" dataKey="Petrol" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
