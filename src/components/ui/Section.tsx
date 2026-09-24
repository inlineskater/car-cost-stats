import { cn } from '@/lib/utils'

interface SectionProps {
  title: string
  icon?: React.ReactNode
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}

// A titled page block, like a Notion heading followed by its content.
export default function Section({ title, icon, aside, children, className }: SectionProps) {
  return (
    <section className={cn('space-y-2 min-w-0', className)}>
      <div className="flex items-center justify-between gap-2 min-h-[28px]">
        <h2 className="n-heading">
          {icon && <span className="text-ink-faint">{icon}</span>}
          {title}
        </h2>
        {aside && <div className="flex items-center gap-1 text-sm text-ink-muted">{aside}</div>}
      </div>
      {children}
    </section>
  )
}
