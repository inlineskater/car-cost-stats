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
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 transition-colors',
          error
            ? 'ring-2 ring-red-400'
            : 'focus:ring-blue-400/40',
          className,
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'
export default Input
