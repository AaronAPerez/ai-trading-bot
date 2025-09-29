"use client"

import React from 'react'
import { useMarketStatus } from '@/hooks/market/useMarketStatus'
import {
  Clock,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  TestTube
} from 'lucide-react'

interface MarketStatusDisplayProps {
  compact?: boolean
  showDetails?: boolean
}

export default function MarketStatusDisplay({
  compact = false,
  showDetails = true
}: MarketStatusDisplayProps) {
  const {
    isOpen,
    marketPhase,
    tradingMode,
    currentTime,
    timeUntilOpen,
    timeUntilClose,
    isLoading,
    formatTime,
    getStatusMessage,
    getPhaseColor,
    getPhaseBadgeColor,
    canTradePaper,
    canTradeLive
  } = useMarketStatus()

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Clock className="w-4 h-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-400">Loading market status...</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {tradingMode === 'paper' ? (
          <TestTube className="w-4 h-4 text-blue-400" />
        ) : isOpen ? (
          <PlayCircle className="w-4 h-4 text-green-400" />
        ) : (
          <PauseCircle className="w-4 h-4 text-red-400" />
        )}

        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getPhaseColor()}`}>
            {tradingMode === 'paper' ? 'Paper Trading' : marketPhase.replace('-', ' ').toUpperCase()}
          </span>

          {tradingMode === 'live' && (
            <span className="text-xs text-gray-400">
              {isOpen ? `Closes in ${timeUntilClose}` : `Opens in ${timeUntilOpen}`}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-gray-900/50 to-blue-900/30 rounded-lg border border-gray-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Market Status</h3>
        </div>

        <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getPhaseBadgeColor()}`}>
          {tradingMode === 'paper' ? (
            <div className="flex items-center space-x-1">
              <TestTube className="w-3 h-3" />
              <span>PAPER TRADING</span>
            </div>
          ) : (
            <span>{marketPhase.replace('-', ' ').toUpperCase()}</span>
          )}
        </div>
      </div>

      {/* Status Message */}
      <div className="mb-4">
        <p className={`text-sm font-medium ${getPhaseColor()}`}>
          {getStatusMessage()}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Current time: {formatTime(currentTime)}
        </p>
      </div>

      {showDetails && (
        <>
          {/* Trading Mode Info */}
          <div className="bg-gray-800/30 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2 mb-2">
              {tradingMode === 'paper' ? (
                <TestTube className="w-4 h-4 text-blue-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-green-400" />
              )}
              <span className="text-sm font-medium text-white">
                {tradingMode === 'paper' ? 'Paper Trading Mode' : 'Live Trading Mode'}
              </span>
            </div>

            <div className="text-xs text-gray-300 space-y-1">
              {tradingMode === 'paper' ? (
                <>
                  <div>• Orders accepted 24/7 for testing</div>
                  <div>• Virtual $1,000,000 balance</div>
                  <div>• Real market data, simulated execution</div>
                  <div>• No actual money at risk</div>
                </>
              ) : (
                <>
                  <div>• Real money trading</div>
                  <div>• Market hours: 9:30 AM - 4:00 PM ET</div>
                  <div>• Pre/After hours: Limited trading</div>
                  <div>• Orders rejected when market closed</div>
                </>
              )}
            </div>
          </div>

          {/* Market Hours */}
          {tradingMode === 'live' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/30 rounded-lg p-2">
                <div className="text-xs text-gray-400 mb-1">Next Open</div>
                <div className="text-sm text-white font-mono">
                  {timeUntilOpen || 'Now'}
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-2">
                <div className="text-xs text-gray-400 mb-1">Next Close</div>
                <div className="text-sm text-white font-mono">
                  {timeUntilClose || 'N/A'}
                </div>
              </div>
            </div>
          )}

          {/* Trading Availability */}
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Can Execute Orders:</span>
              <div className="flex items-center space-x-2">
                {(tradingMode === 'paper' ? canTradePaper : canTradeLive) ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400 font-medium">Yes</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-red-400 font-medium">No</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}