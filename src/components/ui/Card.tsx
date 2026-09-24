import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border border-line p-4',
        onClick && 'cursor-pointer hover:bg-surface-subtle transition-colors',
        className,
      )}
    >
      {children}
    </div>
  )
}
