import {
  Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList, Line, ComposedChart,
} from 'recharts'
import type { MonthlyBreakdown } from '@/types'

interface Props {
  data: MonthlyBreakdown[]
  fuelOnly: boolean
}

export default function CostPerKmChart({ data, fuelOnly }: Props) {
  const chartData = data
    .filter((m) => m.kmDriven && m.kmDriven > 0)
    .map((m) => {
      const lpg = m.lpgCostPerKm ?? 0
      const petrol = m.petrolCostPerKm ?? 0
      const service = m.serviceCostPerKm ?? 0
      const insurance = m.insuranceCostPerKm ?? 0
      const inspection = m.inspectionCostPerKm ?? 0
      const other = m.otherCatCostPerKm ?? 0
      const fuelTotal = +(lpg + petrol).toFixed(2)
      const _total = fuelOnly ? fuelTotal : +(lpg + petrol + service + insurance + inspection + other).toFixed(2)
      return {
        label: m.label,
        lpg, petrol,
        ...(fuelOnly ? {} : { service, insurance, inspection, other }),
        fuelTotal,
        _total,
      }
    })

  if (chartData.length < 2) {
    return <p className="text-center text-gray-400 text-sm py-6">Need at least 2 months of data</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(2)} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          itemStyle={{ color: '#6B7280' }}
          formatter={(v: number, name: string) => name === 'fuelTotal' ? [`${v.toFixed(2)} zł/km`, 'Fuel only'] : `${v.toFixed(2)} zł/km`}
        />
        <Legend wrapperStyle={{ color: '#6B7280', fontSize: 11 }} />
        <Bar dataKey="lpg" name="LPG" stackId="a" fill="#22c55e" />
        <Bar dataKey="petrol" name="Petrol" stackId="a" fill="#3b82f6" radius={fuelOnly ? [4, 4, 0, 0] : undefined}>
          {fuelOnly && <LabelList dataKey="_total" position="top" fill="#6B7280" fontSize={10} formatter={(v: number) => v > 0 ? v.toFixed(2) : ''} />}
        </Bar>
        {!fuelOnly && (
          <>
            <Bar dataKey="service" name="Service" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="insurance" name="Insurance" stackId="a" fill="#06b6d4" />
            <Bar dataKey="inspection" name="Inspection" stackId="a" fill="#f59e0b" />
            <Bar dataKey="other" name="Other" stackId="a" fill="#6b7280" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="_total" position="top" fill="#6B7280" fontSize={10} formatter={(v: number) => v > 0 ? v.toFixed(2) : ''} />
            </Bar>
          </>
        )}
        {!fuelOnly && (
          <Line type="monotone" dataKey="fuelTotal" name="Fuel only" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
