import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { MonthlyBreakdown } from '@/types'

interface CostPerKmChartProps {
  data: MonthlyBreakdown[]
}

export default function CostPerKmChart({ data }: CostPerKmChartProps) {
  const chartData = data
    .filter((m) => m.kmDriven !== null && m.kmDriven > 0)
    .map((m) => ({
      label: m.label,
      lpg: m.lpgCostPerKm ?? 0,
      petrol: m.petrolCostPerKm ?? 0,
      service: (m.serviceCostPerKm ?? 0) + (m.repairCostPerKm ?? 0),
      insurance: m.insuranceCostPerKm ?? 0,
      inspection: m.inspectionCostPerKm ?? 0,
      other: m.otherCatCostPerKm ?? 0,
    }))

  if (chartData.length < 2) {
    return <p className="text-center text-gray-400 text-sm py-6">Need at least 2 months of data</p>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(2)} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          itemStyle={{ color: '#6B7280' }}
          formatter={(v: number) => `${v.toFixed(3)} zł/km`}
        />
        <Legend wrapperStyle={{ color: '#6B7280', fontSize: 11 }} />
        <Bar dataKey="lpg" name="LPG" stackId="a" fill="#22c55e" />
        <Bar dataKey="petrol" name="Petrol" stackId="a" fill="#3b82f6" />
        <Bar dataKey="service" name="Service" stackId="a" fill="#8b5cf6" />
        <Bar dataKey="insurance" name="Insurance" stackId="a" fill="#06b6d4" />
        <Bar dataKey="inspection" name="Inspection" stackId="a" fill="#f59e0b" />
        <Bar dataKey="other" name="Other" stackId="a" fill="#6b7280" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
