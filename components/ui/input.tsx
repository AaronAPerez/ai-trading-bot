/**
 * Accessible Input Component
 * 
 * Features:
 * - WCAG 2.1 AA compliant
 * - Error handling with proper ARIA attributes
 * - Help text support
 * - Required field indicators
 * - Keyboard navigation
 * 
 * @example
 * <Input
 *   label="Project Name"
 *   value={projectName}
 *   onChange={setProjectName}
 *   required
 *   helpText="Enter a descriptive name for your project"
 *   error={nameError}
 * />
 */

import { cn } from '@/lib/utils';
import { forwardRef, useId } from 'react';



interface InputProps {
  label: string;
  type?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
}


const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  type = 'text',
  value,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  className,
  ariaLabel,
  ariaDescribedBy,
  testId,
  onChange,
  onBlur,
  ...props
}, ref) => {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const describedBy = [helpId, errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

  // Input styles
  const inputClasses = cn(
    // Base styles
    'block w-full rounded-lg border px-3 py-2',
    'text-base placeholder-gray-400',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    
    // State-dependent styles
    error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    
    className
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <div className="space-y-1">
      {/* Label */}
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-900"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {/* Input field */}
      <Input
        ref={ref}
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={inputClasses}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        data-testid={testId}
        onChange={handleChange}
        onBlur={onBlur}
        {...props}
      />

      {/* Help text */}
      {helpText && (
        <p id={helpId} className="text-sm text-gray-600">
          {helpText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error instanceof Error ? error.message : String(error || 'Unknown error')}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };