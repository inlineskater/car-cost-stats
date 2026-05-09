import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'lpg' | 'petrol' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  className?: string
}

const variants = {
  lpg: 'bg-green-900/40 text-green-400 border border-green-800',
  petrol: 'bg-blue-900/40 text-blue-400 border border-blue-800',
  success: 'bg-emerald-900/40 text-emerald-400 border border-emerald-800',
  warning: 'bg-amber-900/40 text-amber-400 border border-amber-800',
  danger: 'bg-red-900/40 text-red-400 border border-red-800',
  neutral: 'bg-slate-700 text-slate-300 border border-slate-600',
  info: 'bg-sky-900/40 text-sky-400 border border-sky-800',
}

export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
