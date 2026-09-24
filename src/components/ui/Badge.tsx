import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'lpg' | 'petrol' | 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'purple' | 'yellow'
  className?: string
}

// Notion "select" tag colors
const variants = {
  lpg: 'bg-[#dbeddb] text-[#1c3829]',
  petrol: 'bg-[#d3e5ef] text-[#183347]',
  success: 'bg-[#dbeddb] text-[#1c3829]',
  warning: 'bg-[#fadec9] text-[#49290e]',
  danger: 'bg-[#ffe2dd] text-[#5d1715]',
  neutral: 'bg-[#e3e2e0] text-[#32302c]',
  info: 'bg-[#d3e5ef] text-[#183347]',
  purple: 'bg-[#e8deee] text-[#412454]',
  yellow: 'bg-[#fdecc8] text-[#402c1b]',
}

export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-px rounded text-xs whitespace-nowrap', variants[variant], className)}>
      {children}
    </span>
  )
}
