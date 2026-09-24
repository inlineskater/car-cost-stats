import { cn } from '@/lib/utils'

export default function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-5 h-5 border-2 border-line border-t-ink-muted rounded-full animate-spin',
        className,
      )}
    />
  )
}
