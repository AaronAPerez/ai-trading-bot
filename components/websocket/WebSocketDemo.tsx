'use client'

// ===============================================
// WEBSOCKET DEMO COMPONENT
// components/websocket/WebSocketDemo.tsx
// ===============================================

import React, { useState, useEffect } from 'react'
import {
  useWebSocketConnection,
  useWebSocketHealth,
  usePriceTicker
} from '@/hooks/useWebSocketConnection'
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData'
import { useBotWebSocket } from '@/hooks/useBotWebSocket'

// ===============================================
// WEBSOCKET DEMO COMPONENT
// ===============================================

export const WebSocketDemo: React.FC = () => {
  const [serverStats, setServerStats] = useState<any>(null)
  const [connectionTest, setConnectionTest] = useState<string>('')

  // Use WebSocket hooks
  const { status, isConnected, subscribe, stats } = useWebSocketConnection(['AAPL', 'TSLA', 'NVDA', 'MSFT'])
  const health = useWebSocketHealth()
  const prices = usePriceTicker(['AAPL', 'TSLA', 'NVDA', 'MSFT'])
  const { recommendations } = useBotWebSocket()

  // Mock activities for demo purposes (can be replaced with actual activity tracking)
  const activities: any[] = []

  // Test symbols
  const testSymbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN']

  // Fetch server stats
  const fetchServerStats = async () => {
    try {
      const response = await fetch('/api/websocket/health')
      const data = await response.json()
      setServerStats(data)
    } catch (error) {
      console.error('Failed to fetch server stats:', error)
    }
  }

  // Test WebSocket server actions
  const testServerAction = async (action: string) => {
    setConnectionTest(`Testing ${action}...`)
    try {
      const response = await fetch('/api/websocket/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const result = await response.json()
      setConnectionTest(`${action}: ${result.success ? 'Success' : 'Failed'} - ${result.message}`)

      // Refresh stats after action
      setTimeout(fetchServerStats, 1000)
    } catch (error) {
      setConnectionTest(`${action}: Failed - ${error}`)
    }
  }

  // Send test messages
  const sendTestMessage = async (test: string, data?: any) => {
    try {
      const response = await fetch('/api/websocket', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test, data })
      })
      const result = await response.json()
      console.log(`Test ${test}:`, result)
    } catch (error) {
      console.error(`Test ${test} failed:`, error)
    }
  }

  // Subscribe to symbols on mount
  useEffect(() => {
    if (isConnected) {
      subscribe(testSymbols)
    }
  }, [isConnected])

  // Fetch stats on mount
  useEffect(() => {
    fetchServerStats()
    const interval = setInterval(fetchServerStats, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔗 WebSocket Trading Demo
        </h1>
        <p className="text-gray-600">
          Real-time WebSocket implementation for AI Trading Platform
        </p>
      </div>

      {/* WebSocket Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Connection Status</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'connected' ? 'bg-green-100 text-green-700' :
            status === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
            status === 'reconnecting' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>
            {status}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-600">Connected</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold text-blue-600`}>
              {health.subscribedSymbols}
            </div>
            <div className="text-sm text-gray-600">Subscribed</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold text-purple-600`}>
              {health.reconnectAttempts}
            </div>
            <div className="text-sm text-gray-600">Reconnects</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${health.isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {health.isAuthenticated ? '🔐' : '🔓'}
            </div>
            <div className="text-sm text-gray-600">Auth Status</div>
          </div>
        </div>

        {/* Connection Details */}
        <div className="text-sm space-y-1">
          <div>Status: <span className="font-medium">{health.status}</span></div>
          <div>Queued Messages: <span className="font-medium">{health.queuedMessages}</span></div>
          <div>Last Update: <span className="font-medium">{health.lastUpdate.toLocaleTimeString()}</span></div>
        </div>
      </div>

      {/* Server Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Server Management</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => testServerAction('start')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            🚀 Start Server
          </button>
          <button
            onClick={() => testServerAction('stop')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            🛑 Stop Server
          </button>
          <button
            onClick={() => testServerAction('restart')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Restart Server
          </button>
          <button
            onClick={fetchServerStats}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            📊 Refresh Stats
          </button>
        </div>

        {connectionTest && (
          <div className="bg-gray-100 rounded p-3 text-sm font-mono">
            {connectionTest}
          </div>
        )}
      </div>

      {/* Real-time Market Data */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📈 Real-time Market Data</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {Object.entries(prices).map(([symbol, data]) => (
            <div key={symbol} className="bg-gray-50 rounded p-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{symbol}</span>
                <span className="text-lg font-bold">
                  ${data.price.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={data.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {data.changePercent >= 0 ? '↑' : '↓'} {Math.abs(data.changePercent).toFixed(2)}%
                </span>
                <span className="text-gray-500">
                  {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => sendTestMessage('market_data', { symbol: 'AAPL' })}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            📊 Send Test Price Update
          </button>
          <button
            onClick={() => sendTestMessage('ping_all')}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            🏓 Ping All Clients
          </button>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🤖 AI Recommendations</h2>

        <div className="space-y-3 mb-4">
          {recommendations.slice(0, 3).map((rec: any) => (
            <div key={rec.id} className="bg-gray-50 rounded p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{rec.symbol}</div>
                  <div className={`text-sm font-medium ${rec.action === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                    {rec.action} • {rec.confidence}% confidence
                  </div>
                  {rec.reasoning && rec.reasoning.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      {rec.reasoning[0]}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm">Target: ${rec.targetPrice?.toFixed(2) || '0.00'}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(rec.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {recommendations.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No recommendations yet. Click "Generate Test Recommendation" below.
            </div>
          )}
        </div>

        <button
          onClick={() => sendTestMessage('ai_recommendation', { symbol: 'TSLA' })}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          🎯 Generate Test Recommendation
        </button>
      </div>

      {/* Bot Activities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📋 Bot Activities</h2>

        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {activities.slice(0, 10).map((activity: any) => (
            <div key={activity.id} className="bg-gray-50 rounded p-2 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{activity.message}</span>
                  {activity.details && (
                    <div className="text-xs text-gray-600">{activity.details}</div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No activities yet. Click "Send Test Activity" below.
            </div>
          )}
        </div>

        <button
          onClick={() => sendTestMessage('bot_activity')}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          📝 Send Test Activity
        </button>
      </div>

      {/* Server Statistics */}
      {serverStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Server Statistics</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">WebSocket Server</h3>
              <div className="space-y-1 text-sm">
                <div>Status: <span className="font-medium text-green-600">{serverStats.status}</span></div>
                {serverStats.websocket && (
                  <>
                    <div>Clients: <span className="font-medium">{serverStats.websocket.clientCount}</span></div>
                    <div>Channels: <span className="font-medium">{serverStats.websocket.channelCount}</span></div>
                    <div>Port: <span className="font-medium">{serverStats.websocket.port}</span></div>
                    <div>Uptime: <span className="font-medium">{Math.round(serverStats.websocket.uptime / 1000)}s</span></div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">System Resources</h3>
              <div className="space-y-1 text-sm">
                {serverStats.system && (
                  <>
                    <div>Memory: <span className="font-medium">{serverStats.system.memory.heapUsed}MB used</span></div>
                    <div>Platform: <span className="font-medium">{serverStats.system.platform}</span></div>
                    <div>Node: <span className="font-medium">{serverStats.system.nodeVersion}</span></div>
                    <div>Uptime: <span className="font-medium">{serverStats.system.uptime}s</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WebSocketDemo