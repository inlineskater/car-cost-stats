import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { MonthlyBreakdown } from '@/types'
import { CHART_COLORS, axisProps, gridProps, legendProps, tooltipProps } from '@/lib/chartTheme'

interface MonthlyBarChartProps {
  data: MonthlyBreakdown[]
  fuelOnly?: boolean
}

export default function MonthlyBarChart({ data, fuelOnly }: MonthlyBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v: number) => `${v}`} />
        <Tooltip {...tooltipProps} formatter={(v: number) => `${v.toFixed(0)} zł`} />
        <Legend {...legendProps} />
        <Bar isAnimationActive={false} dataKey="lpgCost" name="LPG" stackId="a" fill={CHART_COLORS.lpg} />
        <Bar isAnimationActive={false} dataKey="petrolCost" name="Petrol" stackId="a" fill={CHART_COLORS.petrol} radius={fuelOnly ? [3, 3, 0, 0] : undefined} />
        {!fuelOnly && (
          <Bar isAnimationActive={false} dataKey="otherCost" name="Other" stackId="a" fill={CHART_COLORS.inspection} radius={[3, 3, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
