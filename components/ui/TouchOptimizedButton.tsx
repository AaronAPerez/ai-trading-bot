// components/ui/TouchOptimizedButton.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface TouchOptimizedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  touchTarget?: boolean
}

export const TouchOptimizedButton = forwardRef<HTMLButtonElement, TouchOptimizedButtonProps>(
  ({ variant = 'primary', size = 'medium', touchTarget = true, className = '', children, ...props }, ref) => {
    const baseClasses = 'rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900'
    
    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
    }

    const sizeClasses = {
      small: touchTarget ? 'px-3 py-2 text-sm min-h-[44px]' : 'px-3 py-2 text-sm',
      medium: touchTarget ? 'px-4 py-2 min-h-[44px]' : 'px-4 py-2',
      large: touchTarget ? 'px-6 py-3 text-lg min-h-[48px]' : 'px-6 py-3 text-lg'
    }

    const touchClasses = touchTarget ? 'active:scale-95 touch-manipulation' : ''

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${touchClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

TouchOptimizedButton.displayName = 'TouchOptimizedButton'