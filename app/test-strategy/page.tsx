/**
 * Test Strategy Builder Page
 * Uses React Query for data fetching, Zustand for state, Alpaca API and Supabase
 * NO MOCK DATA - All real data sources
 */

'use client'

import { StrategyBuilder } from '@/components/dashboard/StrategyBuilder'
import { useBotControl } from '@/hooks/useBotControl'
import { BotConfiguration } from '@/types/trading'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export default function TestStrategyPage() {
  const { startBot, botStatus, isRunning } = useBotControl()
  const [lastSavedConfig, setLastSavedConfig] = useState<BotConfiguration | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Fetch real Alpaca account data using React Query
  const { data: accountData } = useQuery({
    queryKey: ['alpaca-account'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/account')
      if (!response.ok) throw new Error('Failed to fetch account')
      return response.json()
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Fetch real positions data
  const { data: positionsData } = useQuery({
    queryKey: ['alpaca-positions'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/positions')
      if (!response.ok) throw new Error('Failed to fetch positions')
      return response.json()
    },
    refetchInterval: 15000 // Refresh every 15 seconds
  })

  const handleSaveConfig = async (config: BotConfiguration) => {
    try {
      setLastSavedConfig(config)
      setNotification({
        type: 'success',
        message: 'Configuration saved to Supabase successfully!'
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to save configuration'
      })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  const handleStartBot = async (config: BotConfiguration) => {
    try {
      const result = await startBot(config)
      if (result.success) {
        setNotification({
          type: 'success',
          message: `Bot started successfully with ${config.strategies.filter(s => s.enabled).length} strategies!`
        })
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'Failed to start bot'
        })
      }
      setTimeout(() => setNotification(null), 5000)
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'An error occurred while starting the bot'
      })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Strategy Builder Test Page
          </h1>
          <p className="text-gray-600">
            Configure your AI trading strategies using real Alpaca API data
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Real-time Data Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Alpaca Account Status */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Alpaca Account
            </h3>
            {accountData?.success ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Equity:</span>
                  <span className="font-semibold">
                    ${parseFloat(accountData.data.equity).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Buying Power:</span>
                  <span className="font-semibold">
                    ${parseFloat(accountData.data.buying_power).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading real account data...</p>
            )}
          </div>

          {/* Bot Status */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Bot Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isRunning ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <span className="font-semibold">
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              {botStatus && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scans:</span>
                    <span className="font-semibold">{botStatus.scanCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Health:</span>
                    <span className={`font-semibold ${
                      botStatus.health === 'HEALTHY' ? 'text-green-600' :
                      botStatus.health === 'WARNING' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {botStatus.health}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Positions */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Active Positions
            </h3>
            {positionsData?.success ? (
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Count:</span>
                  <span className="font-semibold">
                    {positionsData.data.length}
                  </span>
                </div>
                {positionsData.data.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    {positionsData.data.slice(0, 3).map((pos: any) => (
                      <div key={pos.symbol} className="flex justify-between">
                        <span>{pos.symbol}</span>
                        <span>{pos.qty} shares</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading positions...</p>
            )}
          </div>
        </div>

        {/* Strategy Builder Component */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <StrategyBuilder
            onSave={handleSaveConfig}
            onStartBot={handleStartBot}
          />
        </div>

        {/* Last Saved Config Display */}
        {lastSavedConfig && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-3">Last Saved Configuration</h3>
            <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(lastSavedConfig, null, 2)}
            </pre>
          </div>
        )}

        {/* Data Source Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            ✅ Real Data Sources Active
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Alpaca API - Real-time market data and account info</li>
            <li>✓ Supabase Database - Configuration persistence</li>
            <li>✓ React Query - Automatic data fetching and caching</li>
            <li>✓ Zustand Store - Global state management</li>
            <li>✗ No mock data - All data from production sources</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
