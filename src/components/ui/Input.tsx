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
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      )}
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full bg-slate-800 border rounded-xl px-4 py-3 text-white placeholder-slate-500',
          'focus:outline-none focus:ring-1 transition-colors',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500',
          className,
        )}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'
export default Input
