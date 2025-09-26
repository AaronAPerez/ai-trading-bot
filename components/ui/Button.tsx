import { cn } from '@/lib/utils';
import { forwardRef, ReactNode } from 'react';


interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  testId?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onFocus?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  icon,
  iconPosition = 'left',
  className,
  ariaLabel,
  ariaDescribedBy,
  testId,
  onClick,
  onFocus,
  children,
  ...props
}, ref) => {
  // Base styles following design system
  const baseStyles = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'select-none'
  ];

  // Variant styles
  const variantStyles = {
    primary: [
      'bg-blue-600 text-white border border-blue-600',
      'hover:bg-blue-700 hover:border-blue-700',
      'focus:ring-blue-500',
      'active:bg-blue-800'
    ],
    secondary: [
      'bg-gray-100 text-gray-900 border border-gray-300',
      'hover:bg-gray-200 hover:border-gray-400',
      'focus:ring-gray-500',
      'active:bg-gray-300'
    ],
    ghost: [
      'bg-transparent text-gray-700 border border-transparent',
      'hover:bg-gray-100',
      'focus:ring-gray-500',
      'active:bg-gray-200'
    ],
    danger: [
      'bg-red-600 text-white border border-red-600',
      'hover:bg-red-700 hover:border-red-700',
      'focus:ring-red-500',
      'active:bg-red-800'
    ]
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px]',
    md: 'px-4 py-2 text-base min-h-[40px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]'
  };

  // Loading spinner component
  const LoadingSpinner = ({ size }: { size: 'sm' | 'md' | 'lg' }) => {
    const spinnerSize = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    return (
      <svg
        className={cn(
          'animate-spin',
          spinnerSize[size]
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          className="opacity-75"
        />
      </svg>
    );
  };

  // Combine all styles
  const buttonClasses = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-testid={testId}
      onClick={loading ? undefined : onClick}
      {...props}
    >
      {/* Loading state */}
      {loading && (
        <>
          <LoadingSpinner size={size} />
          <span className="ml-2">{loadingText}</span>
          <span className="sr-only">Loading, please wait</span>
        </>
      )}

      {/* Normal state */}
      {!loading && (
        <>
          {icon && iconPosition === 'left' && (
            <span className="mr-2" aria-hidden="true">
              {icon}
            </span>
          )}
          
          <span>{children}</span>
          
          {icon && iconPosition === 'right' && (
            <span className="ml-2" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };