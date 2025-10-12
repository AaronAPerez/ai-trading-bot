'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export default function BacktestResultsPanel() {
  const [strategyFilter, setStrategyFilter] = useState('')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [sortKey, setSortKey] = useState<'win_rate' | 'total_pnl' | 'max_drawdown'>('win_rate')

  const { data, isLoading, error } = useQuery({
    queryKey: ['backtestResults'],
    queryFn: async () => {
      const res = await fetch('/api/backtest/results')
      if (!res.ok) throw new Error('Failed to fetch backtest results')
      return await res.json()
    },
    refetchInterval: 30000
  })

  const filtered = data
    ?.filter((r: any) => {
      return (
        (!strategyFilter || r.strategy === strategyFilter) &&
        (!symbolFilter || r.symbol === symbolFilter)
      )
    })
    .sort((a: any, b: any) => b[sortKey] - a[sortKey])

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-md mt-6">
      <h2 className="text-white font-semibold mb-4">📊 Backtest Results</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <select
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm"
          value={strategyFilter}
          onChange={e => setStrategyFilter(e.target.value)}
        >
          <option value="">All Strategies</option>
          <option value="meanReversion">Mean Reversion</option>
          <option value="momentum">Momentum</option>
          <option value="breakout">Breakout</option>
        </select>

        <select
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm"
          value={symbolFilter}
          onChange={e => setSymbolFilter(e.target.value)}
        >
          <option value="">All Symbols</option>
          <option value="AAPL">AAPL</option>
          <option value="TSLA">TSLA</option>
          <option value="NVDA">NVDA</option>
        </select>

        <select
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm"
          value={sortKey}
          onChange={e => setSortKey(e.target.value as any)}
        >
          <option value="win_rate">Sort by Win Rate</option>
          <option value="total_pnl">Sort by PnL</option>
          <option value="max_drawdown">Sort by Drawdown</option>
        </select>
      </div>

      {error ? (
        <div className="text-red-400">Error loading results</div>
      ) : isLoading ? (
        <div className="animate-pulse bg-gray-700 h-24 rounded-lg"></div>
      ) : (
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs uppercase text-gray-400 border-b border-gray-700">
            <tr>
              <th>Strategy</th>
              <th>Symbol</th>
              <th>Trades</th>
              <th>Win Rate</th>
              <th>PnL</th>
              <th>Drawdown</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((r: any) => (
              <tr key={`${r.strategy}-${r.symbol}`} className="border-b border-gray-800">
                <td>{r.strategy}</td>
                <td>{r.symbol}</td>
                <td>{r.trades_executed}</td>
                <td>{(r.win_rate * 100).toFixed(1)}%</td>
                <td className={r.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>${r.total_pnl.toFixed(2)}</td>
                <td>{(r.max_drawdown * 100).toFixed(1)}%</td>
                <td>{(r.avg_confidence * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
// 'use client'

// import TestOrderFix from '../../../test_order_fix'

// export default function TestPage() {
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
//       <TestOrderFix />
//     </div>
//   )
// }