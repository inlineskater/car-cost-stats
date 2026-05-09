import Card from '@/components/ui/Card'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
}

export default function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </Card>
  )
}
