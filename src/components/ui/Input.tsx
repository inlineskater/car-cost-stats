import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-xs text-ink-muted mb-1">{label}</label>
      )}
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full bg-white border border-line rounded-md px-3 py-2 text-ink placeholder-ink-faint',
          'focus:outline-none focus:ring-2 transition-colors',
          error
            ? 'ring-2 ring-red-300 border-red-300'
            : 'focus:ring-accent/30 focus:border-accent/60',
          className,
        )}
      />
      {error && <p className="mt-1 text-xs text-[#eb5757]">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'
export default Input
