import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-xs text-ink-muted mb-1">{label}</label>
      )}
      <select
        ref={ref}
        {...props}
        className={cn(
          'w-full bg-white border border-line rounded-md px-3 py-2 text-ink',
          'focus:outline-none focus:ring-2 transition-colors appearance-none',
          error
            ? 'ring-2 ring-red-300 border-red-300'
            : 'focus:ring-accent/30 focus:border-accent/60',
          className,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-[#eb5757]">{error}</p>}
    </div>
  ),
)
Select.displayName = 'Select'
export default Select
