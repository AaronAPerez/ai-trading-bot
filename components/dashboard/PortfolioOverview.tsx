// ===============================================
// PORTFOLIO OVERVIEW - Portfolio Summary Component
// src/components/portfolio/PortfolioOverview.tsx
// ===============================================

import { useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Activity,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import type { PortfolioOverviewProps, Position } from '@/types/trading'

/**
 * Portfolio overview component displaying key metrics, performance charts,
 * and position summaries with real-time updates
 */
const PortfolioOverview = ({
  portfolio,
  positions,
  isLoading = false,
  error
}: PortfolioOverviewProps) => {

  /**
   * Calculate portfolio composition and sector allocation
   */
  const portfolioAnalysis = useMemo(() => {
    if (!positions?.length) {
      return {
        totalPositions: 0,
        winnersCount: 0,
        losersCount: 0,
        largestPosition: null,
        concentration: [],
        sectorAllocation: []
      }
    }

    const winners = positions.filter(pos => pos.unrealizedPnL > 0)
    const losers = positions.filter(pos => pos.unrealizedPnL < 0)
    const largestByValue = positions.reduce((prev, current) => 
      Math.abs(current.marketValue) > Math.abs(prev.marketValue) ? current : prev
    )

    // Calculate position concentration (top 5 positions by market value)
    const concentration = positions
      .sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue))
      .slice(0, 5)
      .map(pos => ({
        symbol: pos.symbol,
        value: pos.marketValue,
        percentage: portfolio?.portfolioValue ? (Math.abs(pos.marketValue) / portfolio.portfolioValue) * 100 : 0,
        pnl: pos.unrealizedPnL
      }))

    // Basic sector allocation (simplified - would use real sector data in production)
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology', 
      'GOOGL': 'Technology',
      'TSLA': 'Consumer Discretionary',
      'NVDA': 'Technology',
      'META': 'Communication',
      'AMZN': 'Consumer Discretionary',
      'NFLX': 'Communication',
      'JPM': 'Financials',
      'V': 'Financials',
      'BTCUSD': 'Cryptocurrency',
      'ETHUSD': 'Cryptocurrency'
    }

    const sectorTotals: Record<string, number> = {}
    positions.forEach(pos => {
      const sector = sectorMap[pos.symbol] || 'Other'
      sectorTotals[sector] = (sectorTotals[sector] || 0) + Math.abs(pos.marketValue)
    })

    const sectorAllocation = Object.entries(sectorTotals).map(([sector, value]) => ({
      sector,
      value,
      percentage: (value / portfolio?.portfolioValue) * 100
    }))

    return {
      totalPositions: positions.length,
      winnersCount: winners.length,
      losersCount: losers.length,
      largestPosition: largestByValue,
      concentration,
      sectorAllocation
    }
  }, [positions, portfolio?.portfolioValue])

  /**
   * Calculate performance metrics
   */
  const performanceMetrics = useMemo(() => {
    const dayPnLPercent = portfolio?.lastDayEquity > 0
      ? (portfolio.dayPnL / portfolio.lastDayEquity) * 100
      : 0

    const totalPnLPercent = portfolio?.portfolioValue > 0
      ? (portfolio.totalPnL / (portfolio.portfolioValue - portfolio.totalPnL)) * 100
      : 0

    return {
      dayPnLPercent,
      totalPnLPercent,
      buyingPowerUsed: ((portfolio?.portfolioValue - portfolio?.buyingPower) / portfolio?.portfolioValue) * 100
    }
  }, [portfolio])

  /**
   * Format currency values with appropriate decimals
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  /**
   * Format percentage values
   */
  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  /**
   * Get color class based on value (positive/negative)
   */
  const getValueColor = (value: number): string => {
    if (value > 0) return 'text-green-400'
    if (value < 0) return 'text-red-400'
    return 'text-gray-300'
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-400" />
          <span className="ml-2 text-gray-400">Loading portfolio data...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-300">Error loading portfolio: {error instanceof Error ? error.message : String(error || 'Unknown error')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(portfolio.portfolioValue)}
              </p>
            </div>
            <div className="p-2 bg-blue-900 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className={getValueColor(performanceMetrics.totalPnLPercent)}>
              {formatPercentage(performanceMetrics.totalPnLPercent)}
            </span>
            <span className="text-gray-400 ml-1">total return</span>
          </div>
        </div>

        {/* Daily P&L */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Daily P&L</p>
              <p className={`text-2xl font-bold ${getValueColor(portfolio.dayPnL)}`}>
                {formatCurrency(portfolio.dayPnL)}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${portfolio.dayPnL >= 0 ? 'bg-green-900' : 'bg-red-900'}`}>
              {portfolio.dayPnL >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-400" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-400" />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className={getValueColor(performanceMetrics.dayPnLPercent)}>
              {formatPercentage(performanceMetrics.dayPnLPercent)}
            </span>
            <span className="text-gray-400 ml-1">today</span>
          </div>
        </div>

        {/* Buying Power */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Buying Power</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(portfolio.buyingPower)}
              </p>
            </div>
            <div className="p-2 bg-purple-900 rounded-lg">
              <Activity className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-300">
              {(100 - performanceMetrics.buyingPowerUsed).toFixed(1)}%
            </span>
            <span className="text-gray-400 ml-1">available</span>
          </div>
        </div>

        {/* Positions Summary */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Open Positions</p>
              <p className="text-2xl font-bold text-white">
                {portfolioAnalysis.totalPositions}
              </p>
            </div>
            <div className="p-2 bg-indigo-900 rounded-lg">
              <PieChart className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm space-x-2">
            <span className="text-green-400">{portfolioAnalysis.winnersCount} ↑</span>
            <span className="text-red-400">{portfolioAnalysis.losersCount} ↓</span>
          </div>
        </div>
      </div>

      {/* Positions Table and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Positions */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Current Positions</h3>
            <p className="text-sm text-gray-400">Real-time position tracking</p>
          </div>
          <div className="overflow-x-auto">
            {positions.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Symbol</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">Qty</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">Price</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">Market Value</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">P&L</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.slice(0, 10).map((position) => (
                    <tr key={position.symbol} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="p-4">
                        <div className="font-medium text-white">{position.symbol}</div>
                        <div className="text-xs text-gray-400 capitalize">{position.side}</div>
                      </td>
                      <td className="text-right p-4 text-white">
                        {Math.abs(position.qty).toLocaleString()}
                      </td>
                      <td className="text-right p-4 text-white">
                        {formatCurrency(position.currentPrice)}
                      </td>
                      <td className="text-right p-4 text-white">
                        {formatCurrency(position.marketValue)}
                      </td>
                      <td className={`text-right p-4 ${getValueColor(position.unrealizedPnL)}`}>
                        {formatCurrency(position.unrealizedPnL)}
                      </td>
                      <td className={`text-right p-4 ${getValueColor(position.unrealizedPnLPercent)}`}>
                        {formatPercentage(position.unrealizedPnLPercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <PieChart className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No open positions</p>
                <p className="text-sm text-gray-500 mt-1">Positions will appear here when trades are executed</p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Analytics */}
        <div className="space-y-4">
          {/* Position Concentration */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Position Concentration</h4>
            {portfolioAnalysis.concentration.length > 0 ? (
              <div className="space-y-2">
                {portfolioAnalysis.concentration.map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{item.symbol}</span>
                    <div className="text-right">
                      <div className="text-sm text-white">{item.percentage.toFixed(1)}%</div>
                      <div className={`text-xs ${getValueColor(item.pnl)}`}>
                        {formatCurrency(item.pnl)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No concentration data available</p>
            )}
          </div>

          {/* Sector Allocation */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Sector Allocation</h4>
            {portfolioAnalysis.sectorAllocation.length > 0 ? (
              <div className="space-y-2">
                {portfolioAnalysis.sectorAllocation
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((sector) => (
                  <div key={sector.sector} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{sector.sector}</span>
                    <div className="text-right">
                      <div className="text-sm text-white">{sector.percentage.toFixed(1)}%</div>
                      <div className="text-xs text-gray-400">
                        {formatCurrency(sector.value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No sector data available</p>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Account Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Account Type:</span>
                <span className={`font-medium ${portfolio.accountType === 'LIVE' ? 'text-red-400' : 'text-blue-400'}`}>
                  {portfolio.accountType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cash Balance:</span>
                <span className="text-white">{formatCurrency(portfolio.cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Day Trades:</span>
                <span className="text-white">{portfolio.daytradeCountToday}/3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Currency:</span>
                <span className="text-white">{portfolio.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PortfolioOverview