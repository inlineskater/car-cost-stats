import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { MonthlyBreakdown } from '@/types'
import { CHART_COLORS, axisProps, gridProps, tooltipProps } from '@/lib/chartTheme'

interface KmPerMonthChartProps {
  data: MonthlyBreakdown[]
}

export default function KmPerMonthChart({ data }: KmPerMonthChartProps) {
  const chartData = data.filter((d) => d.kmDriven !== null && d.kmDriven > 0)
  if (chartData.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="kmFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.km} stopOpacity={0.18} />
            <stop offset="100%" stopColor={CHART_COLORS.km} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipProps} cursor={{ stroke: '#e9e9e7' }} formatter={(v: number) => [`${v.toLocaleString('pl-PL')} km`, 'Driven']} />
        <Area
          type="monotone"
          dataKey="kmDriven"
          stroke={CHART_COLORS.km}
          strokeWidth={2}
          fill="url(#kmFill)"
          dot={{ r: 2.5, fill: CHART_COLORS.km, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
