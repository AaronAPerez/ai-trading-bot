import React, { useState } from 'react'

const TestOrderFix: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Test position sizing with different scenarios
  const testPositionSizing = () => {
    const scenarios = [
      { confidence: 65, buyingPower: 834, expected: '~$25-50' },
      { confidence: 75, buyingPower: 834, expected: '~$40-70' },
      { confidence: 85, buyingPower: 834, expected: '~$60-90' },
      { confidence: 95, buyingPower: 834, expected: '~$75-100' }
    ]

    const results = scenarios.map(scenario => {
      const positionPercent = Math.min(0.03 + Math.max(0, (scenario.confidence - 60) / 100) * 0.07, 0.10)
      const positionSize = Math.min(
        Math.max(25, scenario.buyingPower * positionPercent),
        scenario.buyingPower * 0.2
      )
      
      return {
        ...scenario,
        calculated: `$${positionSize.toFixed(2)}`,
        percentage: `${(positionPercent * 100).toFixed(1)}%`,
        safe: positionSize <= scenario.buyingPower * 0.2
      }
    })

    setTestResults(results)
  }

  // Test actual API call
  const testAPICall = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-order',
          symbol: 'AAPL',
          confidence: 70
        })
      })
      
      const result = await response.json()
      console.log('API Test Result:', result)
      
      setTestResults(prev => [...prev, {
        type: 'API Test',
        result: result.success ? '✅ Success' : '❌ Failed',
        details: result.message || result.error
      }])
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'API Test',
        result: '❌ Error',
        details: error.message
      }])
    } finally {
      setLoading(false)
    }
  }

  // Check current account status
  const checkAccountStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/alpaca/account')
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        type: 'Account Status',
        result: result.success ? '✅ Connected' : '❌ Failed',
        details: result.success 
          ? `Buying Power: $${result.data?.buying_power || 'Unknown'}`
          : result.error
      }])
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'Account Status', 
        result: '❌ Error',
        details: error.message
      }])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    testPositionSizing()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-cyan-400 mb-6">Order Execution Fix Tester</h1>
        
        {/* Current Issue Summary */}
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
          <h2 className="text-red-400 font-semibold mb-2">🚨 Issues Found:</h2>
          <ul className="text-gray-300 space-y-1 text-sm">
            <li>• Position size too large: $3,780 vs $834 buying power</li>
            <li>• Mixed API endpoints: paper vs live URLs</li>
            <li>• Need percentage-based position sizing</li>
          </ul>
        </div>

        {/* Position Sizing Test */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-emerald-400 font-semibold mb-4">✅ Fixed Position Sizing</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2 text-gray-400">Confidence</th>
                  <th className="text-left p-2 text-gray-400">Buying Power</th>
                  <th className="text-left p-2 text-gray-400">Position %</th>
                  <th className="text-left p-2 text-gray-400">Position Size</th>
                  <th className="text-left p-2 text-gray-400">Safe?</th>
                </tr>
              </thead>
              <tbody>
                {testResults.filter(r => r.confidence).map((result, i) => (
                  <tr key={i} className="border-b border-gray-700/50">
                    <td className="p-2 text-purple-400">{result.confidence}%</td>
                    <td className="p-2 text-cyan-400">${result.buyingPower}</td>
                    <td className="p-2 text-amber-400">{result.percentage}</td>
                    <td className="p-2 text-emerald-400">{result.calculated}</td>
                    <td className="p-2">
                      {result.safe ? '✅ Yes' : '❌ No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={checkAccountStatus}
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Checking...' : '💳 Check Account'}
          </button>
          
          <button
            onClick={testAPICall}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Testing...' : '🧪 Test Order'}
          </button>
          
          <button
            onClick={testPositionSizing}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            🔄 Refresh Tests
          </button>
        </div>

        {/* Test Results */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-indigo-400 font-semibold mb-4">🧪 Test Results</h2>
          
          {testResults.filter(r => r.type).length === 0 ? (
            <p className="text-gray-400">No tests run yet. Click the buttons above to test.</p>
          ) : (
            <div className="space-y-2">
              {testResults.filter(r => r.type).map((result, i) => (
                <div key={i} className="bg-gray-700 rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{result.type}</span>
                    <span className={result.result.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                      {result.result}
                    </span>
                  </div>
                  {result.details && (
                    <p className="text-sm text-gray-400 mt-1">{result.details}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Fix Instructions */}
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mt-6">
          <h2 className="text-blue-400 font-semibold mb-2">⚡ Quick Fix Steps:</h2>
          <ol className="text-gray-300 space-y-1 text-sm list-decimal list-inside">
            <li>Update your calculatePositionSize function with the safer version</li>
            <li>Ensure ALPACA_BASE_URL=https://paper-api.alpaca.markets in .env.local</li>
            <li>Restart your development server</li>
            <li>Test with "Test Order" button above</li>
            <li>Monitor console logs for position sizing details</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default TestOrderFix