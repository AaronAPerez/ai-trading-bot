'use client'

import React from 'react'
import { TrophyIcon, ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

interface PerformanceAnalyticsProps {
  account: any
  positions: any[]
  botConfig: any
}

export function PerformanceAnalytics({ account, positions, botConfig }: PerformanceAnalyticsProps) {
  if (!account) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">Connect your account to view performance analytics</div>
      </div>
    )
  }

  const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
  const totalReturn = account.totalBalance > 0 ? (totalPnL / account.totalBalance) * 100 : 0
  const winningPositions = positions.filter(pos => pos.unrealizedPnL > 0)
  const winRate = positions.length > 0 ? (winningPositions.length / positions.length) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrophyIcon className="w-6 h-6 text-yellow-400" />
        <h2 className="text-2xl font-bold">Performance Analytics</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-gray-400">Total Return</span>
          </div>
          <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {winRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-sm text-gray-400 mb-2">Total P&L</div>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-sm text-gray-400 mb-2">Active Positions</div>
          <div className="text-2xl font-bold text-white">
            {positions.length}
          </div>
        </div>
      </div>

      {/* Account Summary */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Account Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400">Account Value</div>
            <div className="text-xl font-bold text-white">${account.totalBalance.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Available Cash</div>
            <div className="text-xl font-bold text-emerald-400">${account.cashBalance.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Account Type</div>
            <div className={`text-xl font-bold ${account.accountType === 'LIVE' ? 'text-red-400' : 'text-cyan-400'}`}>
              {account.accountType}
            </div>
          </div>
        </div>
      </div>

      {/* Bot Performance */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">AI Bot Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-purple-400">{botConfig.mode}</div>
            <div className="text-xs text-gray-400">Trading Mode</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-cyan-400">{botConfig.maxPositionSize}%</div>
            <div className="text-xs text-gray-400">Max Position</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{botConfig.minimumConfidence}%</div>
            <div className="text-xs text-gray-400">Min Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-400">{botConfig.watchlistSymbols.length}</div>
            <div className="text-xs text-gray-400">Symbols</div>
          </div>
        </div>
      </div>
    </div>
  )
}