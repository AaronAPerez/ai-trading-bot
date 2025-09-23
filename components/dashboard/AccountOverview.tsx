'use client'

import React from 'react'
import { 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ChartBarIcon,
  BanknotesIcon 
} from '@heroicons/react/24/outline'

interface AccountOverviewProps {
  account: any
  positions: any[]
  quotes: Record<string, any>
  botConfig: any
  isLoading: boolean
}

export function AccountOverview({ account, positions, quotes, botConfig, isLoading }: AccountOverviewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-2">Unable to load account data</div>
        <div className="text-gray-500 text-sm">Check your Alpaca API connection</div>
      </div>
    )
  }

  const totalPnL = positions.reduce((sum, pos) => sum + (pos.unrealizedPnL || pos.unrealized_pl || 0), 0)
  const accountBalance = account.totalBalance || account.portfolio_value || account.equity || 0
  const totalReturn = accountBalance > 0 ? (totalPnL / accountBalance) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-cyan-900/20 to-indigo-900/20 border border-cyan-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="w-6 h-6 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-300">Total Balance</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              (account.accountType || account.account_type || 'PAPER') === 'LIVE' ? 'bg-red-600' : 'bg-cyan-600'
            }`}>
              {account.accountType || account.account_type || 'PAPER'}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${(account.totalBalance || account.portfolio_value || account.equity || 0).toLocaleString()}
          </div>
          <div className={`text-sm ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}% Total Return
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 border border-emerald-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <BanknotesIcon className="w-6 h-6 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Available Cash</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${(account.cashBalance || account.cash || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">
            Buying Power: ${(account.availableBuyingPower || account.buying_power || account.dayTradingBuyingPower || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-6 h-6 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">P&L Today</span>
          </div>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">
            {positions.length} Active Positions
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${botConfig.enabled ? 'bg-cyan-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-indigo-300">Bot Status</span>
          </div>
          <div className="text-xl font-bold text-white">
            {botConfig.enabled ? 'ACTIVE' : 'STOPPED'}
          </div>
          <div className="text-sm text-gray-400">
            Mode: {botConfig.mode}
          </div>
        </div>
      </div>

      {/* Current Positions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-6">Current Positions</h3>
        
        {positions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No open positions</div>
            <div className="text-sm text-gray-500">Enable the AI bot to start trading</div>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-semibold text-lg">{position.symbol}</div>
                      <div className="text-sm text-gray-400">
                        {position.quantity || position.qty || 0} shares @ ${(position.avgBuyPrice || position.avg_entry_price || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      (position.side || 'long') === 'long' ? 'bg-emerald-600' : 'bg-red-600'
                    }`}>
                      {(position.side || 'long').toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      ${(position.currentPrice || position.market_value || 0).toFixed(2)}
                    </div>
                    <div className={`text-sm font-medium ${
                      (position.unrealizedPnL || position.unrealized_pl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {(position.unrealizedPnL || position.unrealized_pl || 0) >= 0 ? '+' : ''}${(position.unrealizedPnL || position.unrealized_pl || 0).toFixed(2)}
                      ({(position.unrealizedPnLPercent || position.unrealized_plpc || 0).toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market Data Preview */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-6">Watchlist Market Data</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(quotes).map(([symbol, quote]) => (
            <div key={symbol} className="bg-gray-700 rounded-lg p-4">
              <div className="font-semibold mb-2">{symbol}</div>
              <div className="text-lg font-bold">
                ${(quote.midPrice || quote.price || quote.last_price || 0).toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">
                Spread: ${(quote.spread || quote.bid_ask_spread || 0).toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}