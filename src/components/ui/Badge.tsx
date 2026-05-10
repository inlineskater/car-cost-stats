import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'lpg' | 'petrol' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  className?: string
}

const variants = {
  lpg: 'bg-green-50 text-green-600 border border-green-200',
  petrol: 'bg-blue-50 text-blue-600 border border-blue-200',
  success: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-600 border border-amber-200',
  danger: 'bg-red-50 text-red-500 border border-red-200',
  neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
  info: 'bg-sky-50 text-sky-600 border border-sky-200',
}

export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
