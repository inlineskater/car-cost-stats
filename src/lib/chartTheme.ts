// Shared Recharts styling so every chart reads as one Notion-like system.

export const CHART_COLORS = {
  lpg: '#448361',
  petrol: '#337ea9',
  service: '#9065b0',
  insurance: '#2a9d99',
  inspection: '#cb912f',
  other: '#9b9a97',
  km: '#d9730d',
  accent: '#d44c47',
}

export const gridProps = {
  stroke: '#f1f1ef',
  vertical: false,
} as const

export const axisProps = {
  tick: { fill: '#9b9a97', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export const tooltipProps = {
  cursor: { fill: 'rgba(55,53,47,0.04)' },
  contentStyle: {
    background: '#ffffff',
    border: 'none',
    borderRadius: 6,
    boxShadow: 'rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 3px 6px, rgba(15,15,15,0.2) 0 9px 24px',
    fontSize: 12,
    padding: '6px 10px',
  },
  labelStyle: { color: '#37352f', fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: '#37352f', padding: 0 },
} as const

export const legendProps = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: { color: '#787774', fontSize: 12, paddingTop: 4 },
}
