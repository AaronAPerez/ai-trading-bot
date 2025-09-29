"use client";

import React, { useState } from 'react'

interface ExecutionStatus {
  enabled: boolean
  config: {
    minConfidenceForOrder: number
    maxPositionSize: number
    riskPerTrade: number
    minOrderValue: number
  }
  metrics: {
    totalOrdersExecuted: number
    successfulOrders: number
    failedOrders: number
    totalValue: number
    lastExecutionTime: string | null
  }
  dailyOrderCount: number
  dailyOrderLimit: number
  environment: {
    hasApiKey: boolean
    hasSecretKey: boolean
    baseUrl: string
  }
}

interface TestResult {
  success: boolean
  message: string
  result?: any
}

const OrderExecutionDebugger: React.FC = () => {
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [testSymbol, setTestSymbol] = useState('AAPL')
  const [testConfidence, setTestConfidence] = useState(75)

  // Check current execution status
  const checkExecutionStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-bot?action=execution-status')
      const data = await response.json()
      
      if (data.success) {
        setExecutionStatus(data.orderExecutionStatus)
      }
    } catch (error) {
      console.error('Error checking execution status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Enable order execution
  const enableExecution = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-bot?action=enable-execution')
      const data = await response.json()
      
      if (data.success) {
        setExecutionStatus(data.orderExecutionStatus)
      }
    } catch (error) {
      console.error('Error enabling execution:', error)
    } finally {
      setLoading(false)
    }
  }

  // Test order execution
  const testOrderExecution = async () => {
    setLoading(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/ai-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-order',
          symbol: testSymbol,
          confidence: testConfidence
        })
      })
      
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      console.error('Error testing order:', error)
      setTestResult({
        success: false,
        message: `Error: ${error.message}`
      })
    } finally {
      setLoading(false)
    }
  }

  // Start bot simulation
  const startBot = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-bot?action=start-simulation')
      const data = await response.json()
      
      if (data.success) {
        alert('Bot started successfully!')
      }
    } catch (error) {
      console.error('Error starting bot:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    checkExecutionStatus()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-cyan-400 mb-6">Order Execution Debugger</h1>
        
        {/* Status Panel */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-purple-400 mb-4">Current Status</h2>
          
          {executionStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-400">Execution Enabled</div>
                <div className={`text-xl font-bold ${executionStatus.enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {executionStatus.enabled ? '✅ YES' : '❌ NO'}
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-400">Min Confidence</div>
                <div className="text-xl font-bold text-cyan-400">
                  {executionStatus.config.minConfidenceForOrder}%
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-400">Daily Orders</div>
                <div className="text-xl font-bold text-purple-400">
                  {executionStatus.dailyOrderCount}/{executionStatus.dailyOrderLimit}
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-400">Total Executed</div>
                <div className="text-xl font-bold text-emerald-400">
                  {executionStatus.metrics.totalOrdersExecuted}
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-400">Success Rate</div>
                <div className="text-xl font-bold text-green-400">
                  {executionStatus.metrics.totalOrdersExecuted > 0 
                    ? `${((executionStatus.metrics.successfulOrders / executionStatus.metrics.totalOrdersExecuted) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-400">API Configured</div>
                <div className={`text-xl font-bold ${executionStatus.environment.hasApiKey && executionStatus.environment.hasSecretKey ? 'text-green-400' : 'text-red-400'}`}>
                  {executionStatus.environment.hasApiKey && executionStatus.environment.hasSecretKey ? '✅ YES' : '❌ NO'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Loading status...</div>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={checkExecutionStatus}
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : '🔄 Refresh Status'}
          </button>
          
          <button
            onClick={enableExecution}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : '✅ Enable Execution'}
          </button>
          
          <button
            onClick={startBot}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : '🤖 Start Bot'}
          </button>
        </div>

        {/* Test Order Section */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4">Test Order Execution</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Symbol</label>
              <input
                type="text"
                value={testSymbol}
                onChange={(e) => setTestSymbol(e.target.value.toUpperCase())}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="AAPL"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Confidence %</label>
              <input
                type="number"
                value={testConfidence}
                onChange={(e) => setTestConfidence(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={testOrderExecution}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Testing...' : '🧪 Test Order'}
              </button>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-900/30 border border-green-500/50' : 'bg-red-900/30 border border-red-500/50'}`}>
              <h3 className={`font-semibold mb-2 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                Test Result
              </h3>
              <p className="text-gray-300 mb-2">{testResult.message}</p>
              
              {testResult.result && (
                <pre className="bg-gray-700 p-3 rounded text-sm text-gray-300 overflow-x-auto">
                  {JSON.stringify(testResult.result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Troubleshooting Guide */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-amber-400 mb-4">🔧 Troubleshooting Guide</h2>
          
          <div className="space-y-3">
            {executionStatus && !executionStatus.enabled && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
                <div className="text-red-400 font-semibold">❌ Order Execution Disabled</div>
                <div className="text-gray-300 text-sm">Click "Enable Execution" to allow the bot to place orders</div>
              </div>
            )}
            
            {executionStatus && (!executionStatus.environment.hasApiKey || !executionStatus.environment.hasSecretKey) && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
                <div className="text-red-400 font-semibold">❌ Missing API Credentials</div>
                <div className="text-gray-300 text-sm">
                  Add APCA_API_KEY_ID and APCA_API_SECRET_KEY to your .env.local file
                </div>
              </div>
            )}
            
            {executionStatus && executionStatus.config.minConfidenceForOrder > 70 && (
              <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-3">
                <div className="text-amber-400 font-semibold">⚠️ High Confidence Threshold</div>
                <div className="text-gray-300 text-sm">
                  Confidence threshold is {executionStatus.config.minConfidenceForOrder}%. Consider lowering to 60-65% for more trades.
                </div>
              </div>
            )}
            
            {executionStatus && executionStatus.dailyOrderCount >= executionStatus.dailyOrderLimit && (
              <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-3">
                <div className="text-amber-400 font-semibold">⚠️ Daily Order Limit Reached</div>
                <div className="text-gray-300 text-sm">
                  {executionStatus.dailyOrderCount}/{executionStatus.dailyOrderLimit} orders used today. Limit will reset tomorrow.
                </div>
              </div>
            )}
            
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
              <div className="text-blue-400 font-semibold">💡 Quick Tips</div>
              <ul className="text-gray-300 text-sm mt-2 space-y-1">
                <li>• Start with paper trading (default) to test safely</li>
                <li>• Lower confidence threshold (60-65%) for more frequent trades</li>
                <li>• Check browser console for detailed execution logs</li>
                <li>• Verify your Alpaca account has sufficient buying power</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Environment Info */}
        {executionStatus && (
          <div className="bg-gray-800 rounded-lg p-4 mt-6">
            <h2 className="text-lg font-semibold text-indigo-400 mb-4">🔧 Environment Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Alpaca Base URL</div>
                <div className="text-white font-mono text-sm bg-gray-700 p-2 rounded">
                  {executionStatus.environment.baseUrl}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400">Trading Mode</div>
                <div className="text-white font-mono text-sm bg-gray-700 p-2 rounded">
                  {executionStatus.environment.baseUrl.includes('paper') ? 'Paper Trading' : 'Live Trading'}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400">Min Order Value</div>
                <div className="text-white font-mono text-sm bg-gray-700 p-2 rounded">
                  ${executionStatus.config.minOrderValue}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400">Max Position Size</div>
                <div className="text-white font-mono text-sm bg-gray-700 p-2 rounded">
                  ${executionStatus.config.maxPositionSize}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderExecutionDebugger