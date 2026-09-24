import {
  Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Line, ComposedChart,
} from 'recharts'
import type { MonthlyBreakdown } from '@/types'
import { CHART_COLORS, axisProps, gridProps, legendProps, tooltipProps } from '@/lib/chartTheme'

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
      return {
        label: m.label,
        lpg,
        petrol,
        ...(fuelOnly ? {} : {
          service: m.serviceCostPerKm ?? 0,
          insurance: m.insuranceCostPerKm ?? 0,
          inspection: m.inspectionCostPerKm ?? 0,
          other: m.otherCatCostPerKm ?? 0,
        }),
        fuelTotal: +(lpg + petrol).toFixed(2),
      }
    })

  if (chartData.length < 2) {
    return <p className="text-center text-ink-faint text-sm py-6">Need at least 2 months of data</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v: number) => v.toFixed(2)} />
        <Tooltip {...tooltipProps} formatter={(v: number) => `${v.toFixed(2)} zł/km`} />
        <Legend {...legendProps} />
        <Bar dataKey="lpg" name="LPG" stackId="a" fill={CHART_COLORS.lpg} />
        <Bar dataKey="petrol" name="Petrol" stackId="a" fill={CHART_COLORS.petrol} radius={fuelOnly ? [3, 3, 0, 0] : undefined} />
        {!fuelOnly && <Bar dataKey="service" name="Service" stackId="a" fill={CHART_COLORS.service} />}
        {!fuelOnly && <Bar dataKey="insurance" name="Insurance" stackId="a" fill={CHART_COLORS.insurance} />}
        {!fuelOnly && <Bar dataKey="inspection" name="Inspection" stackId="a" fill={CHART_COLORS.inspection} />}
        {!fuelOnly && <Bar dataKey="other" name="Other" stackId="a" fill={CHART_COLORS.other} radius={[3, 3, 0, 0]} />}
        {!fuelOnly && (
          <Line type="monotone" dataKey="fuelTotal" name="Fuel only" stroke={CHART_COLORS.accent} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
