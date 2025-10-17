"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useAlpacaAccount, useAlpacaPositions } from "@/hooks/api/useAlpacaData"
import { supabaseService } from '@/lib/database/supabase-utils'

interface LiveBalanceDisplayProps {
  refreshInterval?: number
  showChangeIndicators?: boolean
  compact?: boolean
}

interface BalanceMetrics {
  totalBalance: number
  buyingPower: number
  investedAmount: number
  totalPnL: number
  dayPnL: number
  cash: number
  portfolioValue: number
  dayChangePercent: number
  realizedPnL: number
  totalTrades: number
  aiTradesCount: number
  manualTradesCount: number
}

export default function LiveBalanceDisplay({
  refreshInterval = 5000,
  showChangeIndicators = true,
  compact = false
}: LiveBalanceDisplayProps) {
  const account = useAlpacaAccount(refreshInterval)
  const positions = useAlpacaPositions(refreshInterval)
  const [previousMetrics, setPreviousMetrics] = useState<BalanceMetrics | null>(null)
  const [changes, setChanges] = useState<{[key: string]: 'up' | 'down' | 'neutral'}>({})

  // Calculate all balance metrics with useCallback to prevent infinite loops
  const calculateMetrics = useCallback((): BalanceMetrics => {
    // Extract account data with fallback handling
    const accountData = account.data || {}

    // Alpaca returns equity as the total account value
    const totalBalance = parseFloat(accountData.equity || '0')
    const buyingPower = parseFloat(accountData.buying_power || accountData.buyingPower || '0')
    const cash = parseFloat(accountData.cash || '0')
    const portfolioValue = parseFloat(accountData.portfolio_value || accountData.portfolioValue || accountData.equity || '0')

    // Handle positions data (ensure it's an array)
    const positionsArray = Array.isArray(positions.data) ? positions.data : []

    // Calculate invested amount from positions (absolute value of market_value)
    const investedAmount = positionsArray.reduce((total, pos) => {
      const marketValue = Math.abs(parseFloat(pos.market_value || pos.marketValue || '0'))
      return total + marketValue
    }, 0)

    // Calculate total unrealized P&L from positions
    const totalPnL = positionsArray.reduce((total, pos) => {
      const unrealizedPL = parseFloat(pos.unrealized_pl || pos.unrealized_plpc || pos.unrealizedPL || '0')
      return total + unrealizedPL
    }, 0)

    // Extract daily P&L - check both snake_case and camelCase
    const dayPnL = parseFloat(accountData.equity || '0') - parseFloat(accountData.last_equity || accountData.lastEquity || accountData.equity || '0')

    // Calculate day change percentage
    const previousEquity = parseFloat(accountData.last_equity || accountData.lastEquity || accountData.equity || '0')
    const dayChangePercent = previousEquity > 0 ? ((totalBalance - previousEquity) / previousEquity) * 100 : 0

    return {
      totalBalance,
      buyingPower,
      investedAmount,
      totalPnL,
      dayPnL,
      cash,
      portfolioValue,
      dayChangePercent,
      realizedPnL: 0, // Placeholder
      totalTrades: 0, // Placeholder
      aiTradesCount: 0, // Placeholder
      manualTradesCount: 0 // Placeholder
    }
  }, [account.data, positions.data])

  const currentMetrics = calculateMetrics()

  // Track changes for visual indicators
  useEffect(() => {
    const newMetrics = calculateMetrics()

    if (previousMetrics && showChangeIndicators) {
      const newChanges: {[key: string]: 'up' | 'down' | 'neutral'} = {}

      Object.entries(newMetrics).forEach(([key, value]) => {
        const prevValue = previousMetrics[key as keyof BalanceMetrics]
        if (value > prevValue) newChanges[key] = 'up'
        else if (value < prevValue) newChanges[key] = 'down'
        else newChanges[key] = 'neutral'
      })

      setChanges(newChanges)

      // Clear change indicators after 2 seconds
      const timer = setTimeout(() => {
        setChanges({})
      }, 2000)

      return () => clearTimeout(timer)
    }
    setPreviousMetrics(newMetrics)
  }, [calculateMetrics, previousMetrics, showChangeIndicators])

  // Format currency helper
  const formatCurrency = (value: number, showCents: boolean = true) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0
    }).format(value || 0)
  }

  // Format percentage helper
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Get change indicator styling
  const getChangeStyle = (key: string) => {
    if (!changes[key]) return ''
    switch (changes[key]) {
      case 'up':
        return 'animate-pulse bg-green-500/20 border-green-500/50'
      case 'down':
        return 'animate-pulse bg-red-500/20 border-red-500/50'
      default:
        return ''
    }
  }

  // Format last updated time
  // const formatLastUpdated = () => {
  //   return new Date().toLocaleTimeString('en-US', {
  //     hour12: true,
  //     hour: 'numeric',
  //     minute: '2-digit',
  //     second: '2-digit'
  //   })
  // }

  const isLoading = account.isLoading || positions.isLoading
  const hasError = account.error || positions.error

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`bg-gray-900/40 rounded-lg p-3 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('totalBalance')}`}>
        {/* <div className={`bg-gray-900/40 rounded-lg p-3 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('totalBalance')}`}> */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Balance</span>
            {isLoading && 
            <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin">
              </div>
            }
          </div>
          <div className="text-lg font-bold text-white">
            {isLoading ? (
              <div className="animate-pulse bg-gray-600 h-6 w-20 rounded"></div>
            ) : hasError ? (
              <span className="text-red-400 text-sm">Error</span>
            ) : (
              formatCurrency(currentMetrics.totalBalance, false)
            )}
          </div>
        </div>

        <div className={`bg-gray-900/40 rounded-lg p-3 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('buyingPower')}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Buying Power</span>
            {isLoading && <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="text-lg font-bold text-white">
            {isLoading ? (
              <div className="animate-pulse bg-gray-600 h-6 w-20 rounded"></div>
            ) : hasError ? (
              <span className="text-red-400 text-sm">Error</span>
            ) : (
              formatCurrency(currentMetrics.buyingPower, false)
            )}
          </div>
        </div> 
{/* 
        <div className={`bg-gray-900/40 rounded-lg p-3 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('investedAmount')}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Invested</span>
            {isLoading && <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="text-lg font-bold text-white">
            {isLoading ? (
              <div className="animate-pulse bg-gray-600 h-6 w-20 rounded"></div>
            ) : hasError ? (
              <span className="text-red-400 text-sm">Error</span>
            ) : (
              formatCurrency(currentMetrics.investedAmount, false)
            )}
          </div>
        </div> */}

        {/* <div className={`bg-gray-900/40 rounded-lg p-3 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('totalPnL')}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">P&L</span>
            {isLoading && <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className={`text-lg font-bold ${currentMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {isLoading ? (
              <div className="animate-pulse bg-gray-600 h-6 w-20 rounded"></div>
            ) : hasError ? (
              <span className="text-red-400 text-sm">Error</span>
            ) : (
              `${currentMetrics.totalPnL >= 0 ? '+' : ''}${formatCurrency(currentMetrics.totalPnL, false)}`
            )}
          </div>
        </div> */}
      </div>
    )
  }

  return (
    <div>
    {/* // <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-xl p-6 shadow-2xl"> */}
      {/* Header */}
      {/* <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Live Account Balance</h3>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : hasError ? 'bg-red-400' : 'bg-green-400'}`}></div>
          <span>
            {isLoading ? 'Updating...' : hasError ? 'Connection error' : 'Live data'}
          </span>
          <span className="text-gray-500">•</span>
          <span>Last updated: {formatLastUpdated()}</span>
        </div>
      </div> */}

      {/* Main Balance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`bg-gray-900/40 rounded-lg p-4 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('totalBalance')}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
              </svg>
              <span className="text-gray-300 text-sm font-medium">Total Balance</span>
            </div>
            {isLoading && <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? (
              <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
            ) : hasError ? (
              <span className="text-red-400 text-sm">Error loading</span>
            ) : (
              formatCurrency(currentMetrics.totalBalance)
            )}
          </div>
          <div className={`text-xs mt-1 ${currentMetrics.dayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            Today: {isLoading ? 'Loading...' : `${formatPercentage(currentMetrics.dayChangePercent)} (${currentMetrics.dayPnL >= 0 ? '+' : ''}${formatCurrency(currentMetrics.dayPnL)})`}
          </div>
        </div>

        <div className={`bg-gray-900/40 rounded-lg p-4 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('buyingPower')}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              <span className="text-gray-300 text-sm font-medium">Buying Power</span>
            </div>
            {isLoading && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? (
              <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
            ) : hasError ? (
              <span className="text-red-400 text-sm">Error loading</span>
            ) : (
              formatCurrency(currentMetrics.buyingPower)
            )}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Available for trading
          </div>
        </div>

        <div className={`bg-gray-900/40 rounded-lg p-4 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('investedAmount')}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              <span className="text-gray-300 text-sm font-medium">Invested Amount</span>
            </div>
            {isLoading && <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? (
              <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
            ) : hasError ? (
              <span className="text-red-400 text-sm">Error loading</span>
            ) : (
              formatCurrency(currentMetrics.investedAmount)
            )}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {positions.data ? `${positions.data.length} active positions` : 'No positions'}
          </div>
        </div>

        <div className={`bg-gray-900/40 rounded-lg p-4 border border-gray-700/50 transition-all duration-300 ${getChangeStyle('totalPnL')}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"/>
              </svg>
              <span className="text-gray-300 text-sm font-medium">Total P&L</span>
            </div>
            {isLoading && <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className={`text-2xl font-bold ${currentMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {isLoading ? (
              <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
            ) : hasError ? (
              <span className="text-red-400 text-sm">Error loading</span>
            ) : (
              `${currentMetrics.totalPnL >= 0 ? '+' : ''}${formatCurrency(currentMetrics.totalPnL)}`
            )}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Unrealized P&L
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Cash Available</span>
            <span className="text-sm font-medium text-white">{formatCurrency(currentMetrics.cash)}</span>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Portfolio Value</span>
            <span className="text-sm font-medium text-white">{formatCurrency(currentMetrics.portfolioValue)}</span>
          </div>
        </div>
      </div> */}
    </div>
  )
}