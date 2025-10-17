'use client'

import { useQuery } from '@tanstack/react-query'

export default function StrategyGuidancePanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['strategyGuidance'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/hedge-fund')
      if (!res.ok) throw new Error('Failed to fetch strategy guidance')
      return await res.json()
    },
    refetchInterval: 60000, // 1 minute (reduced from 15s)
    retry: 1,
    staleTime: 30000
  })

  const mode = data?.winRate?.mode || 'simulation'
  const strategies = data?.strategies || []

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-md">
      <h2 className="text-white font-semibold mb-4">🧠 Strategy Guidance</h2>

      <p className="text-sm text-gray-300 mb-4">
        Current Mode: <span className="text-green-400 font-bold">{mode.toUpperCase()}</span>
      </p>

      {error ? (
        <div className="text-red-400">Error loading strategy data</div>
      ) : isLoading ? (
        <div className="animate-pulse bg-gray-700 h-24 rounded-lg"></div>
      ) : (
        <ul className="space-y-4">
          {strategies.map((s: any) => (
            <li key={s.strategy} className="text-sm text-gray-300 border-b border-gray-700 pb-2">
              <div className="flex justify-between">
                <span className="text-white font-semibold">{s.strategy}</span>
                <span className="text-xs text-gray-400">{new Date(s.last_updated).toLocaleDateString()}</span>
              </div>
              <div className="text-gray-200">
                Status: {s.status} | Win Rate: {(s.win_rate * 100).toFixed(1)}% | Drawdown: {(s.drawdown * 100).toFixed(1)}%
              </div>
              {s.status === 'underperforming' && (
                <div className="text-yellow-400 text-xs mt-1">⚠️ Consider retraining or rotating strategy</div>
              )}
              {s.status === 'drawdownBreached' && (
                <div className="text-red-400 text-xs mt-1">⛔ Strategy halted due to drawdown breach</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
