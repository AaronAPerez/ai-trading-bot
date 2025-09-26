'use client'

import { useState, useEffect } from 'react'

interface ClientSafeTimeProps {
  timestamp: Date
  format?: 'time' | 'datetime' | 'date'
  className?: string
}

/**
 * ClientSafeTime Component
 * 
 * Renders time safely to prevent hydration mismatches between server and client.
 * The component initially shows a placeholder and then updates with the actual time
 * after client-side hydration is complete.
 * 
 * This prevents the common Next.js hydration error where server-rendered time
 * differs from client-rendered time.
 */
export function ClientSafeTime({ timestamp, format = 'time', className = '' }: ClientSafeTimeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Show placeholder during SSR to prevent hydration mismatch
    return (
      <span className={className}>
        --:--:--
      </span>
    )
  }

  // Client-side rendering with actual time
  const formatTime = () => {
    switch (format) {
      case 'datetime':
        return timestamp.toLocaleString()
      case 'date':
        return timestamp.toLocaleDateString()
      case 'time':
      default:
        return timestamp.toLocaleTimeString()
    }
  }

  return (
    <span className={className}>
      {formatTime()}
    </span>
  )
}

export default ClientSafeTime