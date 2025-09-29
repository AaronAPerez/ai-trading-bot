"use client"

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

interface MarketStatus {
  is_open: boolean
  next_open: string
  next_close: string
  current_time: string
  timezone: string
}

interface MarketHours {
  isOpen: boolean
  nextOpen: Date | null
  nextClose: Date | null
  currentTime: Date
  timeUntilOpen: string | null
  timeUntilClose: string | null
  marketPhase: 'pre-market' | 'market-hours' | 'after-hours' | 'closed'
  tradingMode: 'paper' | 'live'
}

export const useMarketStatus = () => {
  const [localTime, setLocalTime] = useState(new Date())

  // Update local time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Fetch market status from Alpaca API
  const { data: marketData, isLoading, error } = useQuery({
    queryKey: ['market-status'],
    queryFn: async (): Promise<MarketStatus> => {
      const response = await fetch('/api/alpaca/clock')
      if (!response.ok) {
        throw new Error('Failed to fetch market status')
      }
      return response.json()
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })

  // Calculate market hours and status
  const getMarketHours = (): MarketHours => {
    const tradingMode = process.env.NEXT_PUBLIC_TRADING_MODE === 'live' ? 'live' : 'paper'

    if (!marketData) {
      return {
        isOpen: false,
        nextOpen: null,
        nextClose: null,
        currentTime: localTime,
        timeUntilOpen: null,
        timeUntilClose: null,
        marketPhase: 'closed',
        tradingMode
      }
    }

    const currentTime = new Date(marketData.current_time)
    const nextOpen = marketData.next_open ? new Date(marketData.next_open) : null
    const nextClose = marketData.next_close ? new Date(marketData.next_close) : null

    // Calculate time until market events
    const getTimeUntil = (targetTime: Date | null): string | null => {
      if (!targetTime) return null

      const diff = targetTime.getTime() - currentTime.getTime()
      if (diff <= 0) return null

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        return `${hours}h ${minutes}m`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`
      } else {
        return `${seconds}s`
      }
    }

    // Determine market phase
    const getMarketPhase = (): 'pre-market' | 'market-hours' | 'after-hours' | 'closed' => {
      if (marketData.is_open) {
        return 'market-hours'
      }

      const now = currentTime.getHours() * 60 + currentTime.getMinutes()
      const marketOpen = 9 * 60 + 30 // 9:30 AM
      const marketClose = 16 * 60 // 4:00 PM

      if (now < marketOpen && now >= 4 * 60) { // 4:00 AM - 9:30 AM
        return 'pre-market'
      } else if (now > marketClose && now < 20 * 60) { // 4:00 PM - 8:00 PM
        return 'after-hours'
      } else {
        return 'closed'
      }
    }

    return {
      isOpen: marketData.is_open,
      nextOpen,
      nextClose,
      currentTime,
      timeUntilOpen: getTimeUntil(nextOpen),
      timeUntilClose: getTimeUntil(nextClose),
      marketPhase: getMarketPhase(),
      tradingMode
    }
  }

  const marketHours = getMarketHours()

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return {
    ...marketHours,
    isLoading,
    error,
    formatTime,
    formatDate,
    raw: marketData,

    // Helper methods
    canTradeLive: marketHours.isOpen || marketHours.marketPhase === 'pre-market' || marketHours.marketPhase === 'after-hours',
    canTradePaper: true, // Paper trading always available

    // Status messages
    getStatusMessage: (): string => {
      if (marketHours.tradingMode === 'paper') {
        return 'Paper Trading Active (24/7 Available)'
      }

      if (marketHours.isOpen) {
        return `Market Open • Closes in ${marketHours.timeUntilClose || 'calculating...'}`
      } else {
        return `Market Closed • Opens in ${marketHours.timeUntilOpen || 'calculating...'}`
      }
    },

    getPhaseColor: (): string => {
      switch (marketHours.marketPhase) {
        case 'market-hours':
          return 'text-green-400'
        case 'pre-market':
        case 'after-hours':
          return 'text-yellow-400'
        case 'closed':
          return 'text-red-400'
        default:
          return 'text-gray-400'
      }
    },

    getPhaseBadgeColor: (): string => {
      switch (marketHours.marketPhase) {
        case 'market-hours':
          return 'bg-green-900/30 border-green-500/30 text-green-300'
        case 'pre-market':
        case 'after-hours':
          return 'bg-yellow-900/30 border-yellow-500/30 text-yellow-300'
        case 'closed':
          return 'bg-red-900/30 border-red-500/30 text-red-300'
        default:
          return 'bg-gray-900/30 border-gray-500/30 text-gray-300'
      }
    }
  }
}