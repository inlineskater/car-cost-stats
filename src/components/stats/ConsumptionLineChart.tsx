import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { ConsumptionPoint } from '@/types'
import { CHART_COLORS, axisProps, gridProps, legendProps, tooltipProps } from '@/lib/chartTheme'

interface ConsumptionLineChartProps {
  data: ConsumptionPoint[]
  avgLpg: number | null
  avgPetrol: number | null
}

export default function ConsumptionLineChart({ data, avgLpg, avgPetrol }: ConsumptionLineChartProps) {
  const months = [...new Set(data.map((p) => p.date.substring(0, 7)))].sort()

  if (months.length < 2) {
    return <p className="text-center text-ink-faint text-sm py-6">Need at least 2 months of data</p>
  }

  // include the year in the label only when the window spans multiple years
  const spansYears = new Set(months.map((m) => m.slice(0, 4))).size > 1
  const fmt = spansYears ? 'MMM yy' : 'MMM'

  const chartData = months.map((month) => {
    const lpg = data.find((p) => p.fuelType === 'lpg' && p.date.startsWith(month))
    const petrol = data.find((p) => p.fuelType === 'petrol' && p.date.startsWith(month))
    return {
      date: format(parseISO(`${month}-01`), fmt),
      lpg: lpg?.lPer100km ?? null,
      petrol: petrol?.lPer100km ?? null,
    }
  })

  // only draw series that have points in the selected range
  const hasLpg = chartData.some((d) => d.lpg !== null)
  const hasPetrol = chartData.some((d) => d.petrol !== null)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} domain={['auto', 'auto']} />
        <Tooltip {...tooltipProps} cursor={{ stroke: '#e9e9e7' }} formatter={(v: number) => `${v.toFixed(2)} L/100km`} />
        <Legend {...legendProps} />
        {hasLpg && avgLpg !== null && (
          <ReferenceLine y={avgLpg} stroke={CHART_COLORS.lpg} strokeDasharray="3 3" strokeOpacity={0.5} />
        )}
        {hasPetrol && avgPetrol !== null && (
          <ReferenceLine y={avgPetrol} stroke={CHART_COLORS.petrol} strokeDasharray="3 3" strokeOpacity={0.5} />
        )}
        {hasLpg && (
          <Line type="monotone" dataKey="lpg" name="LPG" stroke={CHART_COLORS.lpg} strokeWidth={2}
            dot={{ r: 2.5, fill: CHART_COLORS.lpg, strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls />
        )}
        {hasPetrol && (
          <Line type="monotone" dataKey="petrol" name="Petrol" stroke={CHART_COLORS.petrol} strokeWidth={2}
            dot={{ r: 2.5, fill: CHART_COLORS.petrol, strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
