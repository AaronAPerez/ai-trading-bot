// components/ui/LoadingSpinner.tsx
'use client'

import React from 'react'

/**
 * LoadingSpinner Component
 * 
 * A reusable, accessible loading spinner with multiple size variants
 * and customizable styling. Follows WCAG guidelines for accessibility.
 * 
 * @param size - Size variant: 'small' | 'medium' | 'large'
 * @param color - Color of the spinner (Tailwind color class)
 * @param text - Optional loading text to display
 * @param className - Additional CSS classes
 * @param overlay - Whether to show as full-screen overlay
 * @param ariaLabel - Custom aria-label for accessibility
 */

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: string
  text?: string
  className?: string
  overlay?: boolean
  ariaLabel?: string
}

export function LoadingSpinner({
  size = 'medium',
  color = 'text-blue-500',
  text,
  className = '',
  overlay = false,
  ariaLabel = 'Loading content'
}: LoadingSpinnerProps) {
  // Size configurations for spinner and text
  const sizeConfig = {
    small: {
      spinner: 'w-4 h-4',
      text: 'text-sm',
      gap: 'gap-2'
    },
    medium: {
      spinner: 'w-8 h-8',
      text: 'text-base',
      gap: 'gap-3'
    },
    large: {
      spinner: 'w-12 h-12',
      text: 'text-lg',
      gap: 'gap-4'
    }
  }

  const config = sizeConfig[size]

  // Spinner SVG component with animation
  const SpinnerSVG = () => (
    <svg
      className={`animate-spin ${config.spinner} ${color}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="img"
      aria-label={ariaLabel}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  // Content wrapper with spinner and optional text
  const SpinnerContent = () => (
    <div
      className={`flex flex-col items-center justify-center ${config.gap} ${className}`}
      role="status"
      aria-live="polite"
    >
      <SpinnerSVG />
      {text && (
        <span className={`${config.text} text-gray-300 font-medium`}>
          {text}
        </span>
      )}
      {/* Screen reader only text for accessibility */}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  )

  // Render as overlay or inline component
  if (overlay) {
    return (
      <div
        className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Loading overlay"
      >
        <div className="bg-gray-800 rounded-lg p-8 shadow-2xl border border-gray-700">
          <SpinnerContent />
        </div>
      </div>
    )
  }

  return <SpinnerContent />
}

/**
 * Pulse Loading Component
 * Alternative loading animation with pulse effect
 */
export function PulseLoader({
  className = '',
  size = 'medium'
}: {
  className?: string
  size?: 'small' | 'medium' | 'large'
}) {
  const pulseSize = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4'
  }

  return (
    <div className={`flex space-x-2 ${className}`} role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`${pulseSize[size]} bg-blue-500 rounded-full animate-pulse`}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1.4s'
          }}
        />
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  )
}

/**
 * Skeleton Loader Component
 * For loading placeholders that match content structure
 */
interface SkeletonLoaderProps {
  lines?: number
  height?: string
  className?: string
  showAvatar?: boolean
}

export function SkeletonLoader({
  lines = 3,
  height = 'h-4',
  className = '',
  showAvatar = false
}: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading content">
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className="w-10 h-10 bg-gray-700 rounded-full shrink-0" />
        )}
        <div className="flex-1 space-y-3">
          {Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              className={`bg-gray-700 rounded ${height}`}
              style={{
                width: index === lines - 1 ? '75%' : '100%'
              }}
            />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading content</span>
    </div>
  )
}

/**
 * Chart Loading Component
 * Specialized loader for chart components
 */
export function ChartLoader({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading chart">
      <div className="space-y-4">
        {/* Chart title skeleton */}
        <div className="h-6 bg-gray-700 rounded w-1/3" />
        
        {/* Chart area skeleton */}
        <div className="h-64 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-gray-600 rounded mx-auto mb-2" />
            <div className="h-4 bg-gray-600 rounded w-24" />
          </div>
        </div>
        
        {/* Chart legend skeleton */}
        <div className="flex space-x-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-600 rounded" />
              <div className="h-4 bg-gray-600 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading chart data</span>
    </div>
  )
}

export default LoadingSpinner;