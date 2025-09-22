'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useMarketData } from '@/hooks/useMarketData'
import { useAlpacaTrading } from '@/hooks/useAlpacaTrading'
import {
  ChartBarIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  BoltIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'

// Import sub-components
import { AccountOverview } from './dashboard/AccountOverview'
import { LiveTrades } from './dashboard/LiveTrades'
import { BotConfiguration } from './dashboard/BotConfiguration'
import { PerformanceAnalytics } from './dashboard/PerformanceAnalytics'
import AITradingControl from './dashboard/AITradingControl'
import AIRecommendationsPanel from './dashboard/AIRecommendationsPanel'
import AILearningDashboard from './dashboard/AILearningDashboard'

interface BotConfig {
  enabled: boolean
  mode: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
  maxPositionSize: number
  stopLossPercent: number
  takeProfitPercent: number
  minimumConfidence: number
  watchlistSymbols: string[]
}

export default function AITradingDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'live-trades' | 'ai-signals' | 'bot-config' | 'performance' | 'ai-engine' | 'ai-learning'>('ai-engine')
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [botConfig, setBotConfig] = useState<BotConfig>({
    enabled: false,
    mode: 'BALANCED',
    maxPositionSize: 10,
    stopLossPercent: 5,
    takeProfitPercent: 15,
    minimumConfidence: 80,
    watchlistSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']
  })

  // Real data hooks
  const { quotes, marketStatus, isLoading: marketLoading, error: marketError, refreshData } = useMarketData(botConfig.watchlistSymbols)
  const { account, positions, isLoading: tradingLoading, error: tradingError, fetchAccount, fetchPositions, executeOrder } = useAlpacaTrading()

  // Initialize data on component mount
  useEffect(() => {
    fetchAccount()
    fetchPositions()
  }, [fetchAccount, fetchPositions])

  const toggleBot = useCallback(async () => {
  try {
    // For development - just toggle local state without API call
    setBotConfig(prev => ({ ...prev, enabled: !prev.enabled }))
    
    const newStatus = !botConfig.enabled
    setAlertMessage(`AI Trading Bot ${newStatus ? 'started' : 'stopped'}`)
    
    // Clear alert after 3 seconds
    setTimeout(() => setAlertMessage(null), 3000)
    
    console.log(`Bot ${newStatus ? 'enabled' : 'disabled'}`)
  } catch (error) {
    console.error('Bot toggle error:', error)
    // Revert state on error
    setBotConfig(prev => ({ ...prev, enabled: !prev.enabled }))
    setAlertMessage('Failed to toggle bot')
    setTimeout(() => setAlertMessage(null), 3000)
  }
}, [botConfig.enabled])

//   const toggleBot = useCallback(async () => {
//     try {
//       setBotConfig(prev => ({ ...prev, enabled: !prev.enabled }))
      
//       // In production, this would call your AI service API
//       const response = await fetch('/api/bot/toggle', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ enabled: !botConfig.enabled })
//       })
      
//       if (!response.ok) {
//         throw new Error('Failed to toggle bot')
//       }
//     } catch (error) {
//       console.error('Bot toggle error:', error)
//       // Revert state on error
//       setBotConfig(prev => ({ ...prev, enabled: !prev.enabled }))
//     }
//   }, [botConfig.enabled])

  const navigationTabs = [
    { id: 'ai-engine', name: 'AI Engine Control', icon: RocketLaunchIcon },
    { id: 'ai-signals', name: 'AI Recommendations', icon: CpuChipIcon },
    { id: 'ai-learning', name: 'AI Learning', icon: TrophyIcon },
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'live-trades', name: 'Live Trades', icon: BoltIcon },
    { id: 'bot-config', name: 'Bot Config', icon: Cog6ToothIcon },
    { id: 'performance', name: 'Performance', icon: TrophyIcon }
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <RocketLaunchIcon className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold">AI Trading Bot</h1>
              <p className="text-gray-400">Live trading with Alpaca Markets</p>
            </div>
          </div>

          {/* Bot Status & Controls */}
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${account?.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-gray-400">
                  {account?.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-gray-500">
                Market: {marketStatus}
              </div>
            </div>

            <button
              onClick={toggleBot}
              disabled={!account?.isConnected}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                botConfig.enabled 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              }`}
            >
              {botConfig.enabled ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
              {botConfig.enabled ? 'Stop Bot' : 'Start Bot'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <div className="space-y-2">
            {navigationTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-cyan-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </div>

          {/* Account Summary in Sidebar */}
          {account && (
            <div className="mt-8 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-semibold mb-2">Account Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance:</span>
                  <span className="text-white">${account.totalBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cash:</span>
                  <span className="text-emerald-400">${account.cashBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className={account.accountType === 'LIVE' ? 'text-red-400' : 'text-cyan-400'}>
                    {account.accountType}
                  </span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Error Display */}
          {/* {(marketError || tradingError) && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-400">
                <span className="font-medium">Connection Error</span>
              </div>
              <p className="text-red-200 text-sm mt-1">
                {marketError || tradingError}
              </p>
            </div>
          )} */}

          {/* Tab Content */}
          {activeTab === 'ai-engine' && (
            <AITradingControl />
          )}

          {activeTab === 'ai-signals' && (
            <AIRecommendationsPanel />
          )}

          {activeTab === 'ai-learning' && (
            <AILearningDashboard />
          )}

          {activeTab === 'overview' && (
            <AccountOverview
              account={account}
              positions={positions}
              quotes={quotes}
              botConfig={botConfig}
              isLoading={tradingLoading || marketLoading}
            />
          )}

          {activeTab === 'live-trades' && (
            <LiveTrades
              positions={positions}
              quotes={quotes}
              executeOrder={executeOrder}
              isLoading={tradingLoading}
            />
          )}

          {activeTab === 'bot-config' && (
            <BotConfiguration
              botConfig={botConfig}
              setBotConfig={setBotConfig}
              account={account}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceAnalytics
              account={account}
              positions={positions}
              botConfig={botConfig}
            />
          )}
        </main>
      </div>
    </div>
  )
}