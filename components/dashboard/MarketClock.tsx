'use client'

import React from 'react'
import { useMarketClock } from '@/hooks/useMarketClock'
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface MarketClockProps {
  variant?: 'sidebar' | 'header' | 'card'
  showDetails?: boolean
}

export function MarketClock({ variant = 'card', showDetails = true }: MarketClockProps) {
  const {
    clock,
    isLoading,
    error,
    isMarketOpen,
    timeUntilNextEvent,
    refreshClock
  } = useMarketClock()

  if (error) {
    return (
      <div className={`${variant === 'card' ? 'bg-red-900/20 border border-red-500/30 rounded-lg p-4' : 'flex items-center gap-2'}`}>
        <div className="flex items-center gap-2 text-red-400">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span className="text-sm">Market Clock Error</span>
          {variant === 'card' && (
            <button
              onClick={refreshClock}
              className="ml-2 p-1 hover:bg-red-800/50 rounded"
              title="Retry"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        {variant === 'card' && (
          <p className="text-red-200 text-xs mt-1">{error}</p>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`${variant === 'card' ? 'bg-gray-700 rounded-lg p-4' : 'flex items-center gap-2'}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading market status...</span>
        </div>
      </div>
    )
  }

  if (!clock) {
    return null
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCurrentETTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <div className="bg-gray-700 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Market Status</span>
        </div>
        <div className="flex items-center gap-2">
          {isMarketOpen ? (
            <CheckCircleIcon className="w-3 h-3 text-green-400" />
          ) : (
            <XCircleIcon className="w-3 h-3 text-red-400" />
          )}
          <span className={`text-xs font-medium ${isMarketOpen ? 'text-green-400' : 'text-red-400'}`}>
            {isMarketOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
        {timeUntilNextEvent && (
          <div className="text-xs text-gray-300 mt-1">
            {timeUntilNextEvent}
          </div>
        )}
      </div>
    )
  }

  // Header variant
  if (variant === 'header') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isMarketOpen ? (
            <CheckCircleIcon className="w-4 h-4 text-green-400" />
          ) : (
            <XCircleIcon className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm font-medium ${isMarketOpen ? 'text-green-400' : 'text-red-400'}`}>
            Market {isMarketOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          ET: {getCurrentETTime()}
        </div>
        {timeUntilNextEvent && (
          <div className="text-sm text-gray-300">
            {timeUntilNextEvent}
          </div>
        )}
      </div>
    )
  }

  // Card variant (default)
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-blue-400" />
          Market Clock
        </h4>
        <button
          onClick={refreshClock}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Refresh market clock"
        >
          <ArrowPathIcon className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Status:</span>
          <div className="flex items-center gap-2">
            {isMarketOpen ? (
              <CheckCircleIcon className="w-4 h-4 text-green-400" />
            ) : (
              <XCircleIcon className="w-4 h-4 text-red-400" />
            )}
            <span className={`font-medium text-sm ${isMarketOpen ? 'text-green-400' : 'text-red-400'}`}>
              {isMarketOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
        </div>

        {/* Current Eastern Time */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Current (ET):</span>
          <span className="text-white text-sm font-mono">{getCurrentETTime()}</span>
        </div>

        {/* Countdown */}
        {timeUntilNextEvent && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Next Event:</span>
            <span className="text-blue-400 text-sm font-medium">{timeUntilNextEvent}</span>
          </div>
        )}

        {showDetails && (
          <>
            <div className="border-t border-gray-700 pt-3 mt-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-500 mb-1">Next Open</div>
                  <div className="text-gray-300">
                    <div>{formatDate(clock.next_open)}</div>
                    <div className="font-mono">{formatTime(clock.next_open)} ET</div>
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Next Close</div>
                  <div className="text-gray-300">
                    <div>{formatDate(clock.next_close)}</div>
                    <div className="font-mono">{formatTime(clock.next_close)} ET</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded p-2 mt-3">
              <div className="text-xs text-blue-200">
                <div className="flex items-center gap-1 mb-1">
                  <ClockIcon className="w-3 h-3" />
                  <span className="font-medium">Trading Hours</span>
                </div>
                <div>Regular: 9:30 AM - 4:00 PM ET</div>
                <div>Pre-market: 4:00 AM - 9:30 AM ET</div>
                <div>After-hours: 4:00 PM - 8:00 PM ET</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MarketClock