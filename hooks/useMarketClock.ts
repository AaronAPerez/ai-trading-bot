'use client'

import { useState, useEffect, useCallback } from 'react'

interface MarketClock {
  timestamp: string
  is_open: boolean
  next_open: string
  next_close: string
}

interface UseMarketClockReturn {
  clock: MarketClock | null
  isLoading: boolean
  error: string | null
  isMarketOpen: boolean
  nextEvent: { type: 'open' | 'close', time: Date } | null
  timeUntilNextEvent: string | null
  refreshClock: () => void
}

export function useMarketClock(): UseMarketClockReturn {
  const [clock, setClock] = useState<MarketClock | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeUntilNextEvent, setTimeUntilNextEvent] = useState<string | null>(null)

  const fetchMarketClock = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/alpaca/clock')

      if (!response.ok) {
        throw new Error(`Failed to fetch market clock: ${response.status}`)
      }

      const clockData = await response.json()
      setClock(clockData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market clock'
      setError(errorMessage)
      console.error('Market clock fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Calculate time until next market event
  useEffect(() => {
    if (!clock) {
      setTimeUntilNextEvent(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const nextOpenTime = new Date(clock.next_open)
      const nextCloseTime = new Date(clock.next_close)

      let targetTime: Date
      let eventType: 'open' | 'close'

      if (clock.is_open) {
        targetTime = nextCloseTime
        eventType = 'close'
      } else {
        targetTime = nextOpenTime
        eventType = 'open'
      }

      const timeDiff = targetTime.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setTimeUntilNextEvent(`Market ${eventType} time reached`)
        // Refresh clock data when market status might have changed
        fetchMarketClock()
        return
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      if (hours > 24) {
        const days = Math.floor(hours / 24)
        const remainingHours = hours % 24
        setTimeUntilNextEvent(`${days}d ${remainingHours}h ${minutes}m until ${eventType}`)
      } else if (hours > 0) {
        setTimeUntilNextEvent(`${hours}h ${minutes}m ${seconds}s until ${eventType}`)
      } else {
        setTimeUntilNextEvent(`${minutes}m ${seconds}s until ${eventType}`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [clock, fetchMarketClock])

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchMarketClock()

    // Refresh every 5 minutes
    const interval = setInterval(fetchMarketClock, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchMarketClock])

  const nextEvent = clock ? {
    type: clock.is_open ? 'close' as const : 'open' as const,
    time: new Date(clock.is_open ? clock.next_close : clock.next_open)
  } : null

  return {
    clock,
    isLoading,
    error,
    isMarketOpen: clock?.is_open ?? false,
    nextEvent,
    timeUntilNextEvent,
    refreshClock: fetchMarketClock
  }
}