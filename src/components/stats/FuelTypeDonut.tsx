import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface FuelTypeDonutProps {
  lpgShare: number
  petrolShare: number
}

export default function FuelTypeDonut({ lpgShare, petrolShare }: FuelTypeDonutProps) {
  const data = [
    { name: 'LPG', value: +lpgShare.toFixed(1) },
    { name: 'Petrol', value: +petrolShare.toFixed(1) },
  ].filter((d) => d.value > 0)

  if (data.length === 0) {
    return <p className="text-center text-slate-500 text-sm py-8">No data yet</p>
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
          <Cell fill="#22c55e" />
          <Cell fill="#3b82f6" />
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
          formatter={(v: number) => `${v}%`}
        />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
