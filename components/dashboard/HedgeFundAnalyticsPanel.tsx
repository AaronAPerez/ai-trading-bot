'use client'

import { useQuery } from '@tanstack/react-query'

export default function HedgeFundAnalyticsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['hedgeFundAnalytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/hedge-fund')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return await res.json()
    },
    refetchInterval: 15000
  })

  if (error) return <div className="text-red-400">Error loading analytics</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <MetricCard title="Win Rate Summary" loading={isLoading}>
        <Metric label="Total Trades" value={data?.winRate?.total_trades} />
        <Metric label="Win Rate" value={data?.winRate?.win_rate ? `${(data.winRate.win_rate * 100).toFixed(1)}%` : undefined} />
        <Metric label="Avg Return" value={data?.winRate?.avg_return ? `${(data.winRate.avg_return * 100).toFixed(2)}%` : undefined} />
        <Metric label="Total P&L" value={data?.winRate?.total_pnl ? `$${data.winRate.total_pnl.toFixed(2)}` : undefined} />
      </MetricCard>

      <MetricCard title="Drawdown Tracker" loading={isLoading}>
        <Metric label="Peak P&L" value={data?.drawdown?.peak_pnl ? `$${data.drawdown.peak_pnl.toFixed(2)}` : undefined} />
        <Metric label="Trough P&L" value={data?.drawdown?.trough_pnl ? `$${data.drawdown.trough_pnl.toFixed(2)}` : undefined} />
        <Metric label="Drawdown" value={data?.drawdown?.drawdown ? `$${data.drawdown.drawdown.toFixed(2)}` : undefined} />
        <Metric label="Drawdown Ratio" value={data?.drawdown?.drawdown_ratio ? `${(data.drawdown.drawdown_ratio * 100).toFixed(1)}%` : undefined} />
      </MetricCard>

      <MetricCard title="Strategy Attribution" loading={isLoading}>
        {data?.strategies.map((s: any) => (
          <div key={s.strategy} className="text-sm text-gray-300 flex justify-between">
            <span>{s.strategy}</span>
            <span className="text-white font-semibold">
              {`${(s.win_rate * 100).toFixed(1)}%`} | ${s.total_pnl.toFixed(2)}
            </span>
          </div>
        ))}
      </MetricCard>

      <MetricCard title="Execution Quality" loading={isLoading}>
        {data?.execution.map((e: any) => (
          <div key={e.symbol} className="text-sm text-gray-300 flex justify-between">
            <span>{e.symbol}</span>
            <span className="text-white font-semibold">
              ${e.avg_fill_price.toFixed(2)} | {(e.avg_confidence * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </MetricCard>
    </div>
  )
}

function MetricCard({ title, children, loading }: { title: string; children: React.ReactNode; loading: boolean }) {
  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-xl p-6 border border-gray-700/50 shadow-md">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {loading ? (
        <div className="animate-pulse bg-gray-700 h-24 rounded-lg"></div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex justify-between text-sm text-gray-300">
      <span>{label}</span>
      <span className="font-semibold text-white">{value ?? '—'}</span>
    </div>
  )
}