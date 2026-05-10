import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, parseISO } from 'date-fns'
import { useAllFuelEntries } from '@/hooks/useFuelEntries'

export default function PriceTrendChart() {
  const { data: fuel } = useAllFuelEntries()

  const chartData = useMemo(() => {
    if (!fuel) return []
    const byMonth = new Map<string, { lpgCostSum: number; lpgLiters: number; petrolCostSum: number; petrolLiters: number }>()
    for (const e of fuel) {
      const month = e.date.substring(0, 7)
      const entry = byMonth.get(month) ?? { lpgCostSum: 0, lpgLiters: 0, petrolCostSum: 0, petrolLiters: 0 }
      if (e.fuel_type === 'lpg') { entry.lpgCostSum += Number(e.price_per_liter) * Number(e.liters); entry.lpgLiters += Number(e.liters) }
      else { entry.petrolCostSum += Number(e.price_per_liter) * Number(e.liters); entry.petrolLiters += Number(e.liters) }
      byMonth.set(month, entry)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        date: format(parseISO(`${month}-01`), 'MMM'),
        LPG: d.lpgLiters > 0 ? +(d.lpgCostSum / d.lpgLiters).toFixed(4) : null,
        Petrol: d.petrolLiters > 0 ? +(d.petrolCostSum / d.petrolLiters).toFixed(4) : null,
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
