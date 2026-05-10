import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary: 'bg-blue-500 hover:bg-blue-400 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  ghost: 'hover:bg-gray-100 text-gray-600',
  danger: 'bg-red-500 hover:bg-red-400 text-white',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3 text-base rounded-xl',
}

export default function Button({ variant = 'primary', size = 'md', className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        'font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  )
}
