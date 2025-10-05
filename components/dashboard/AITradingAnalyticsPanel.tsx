'use client'

import { useExecutionAnalytics } from "@/hooks/api/useExecutionAnalytics";



export default function AITradingAnalyticsPanel() {
  const { data, isLoading, error } = useExecutionAnalytics()

  if (error) {
    return <div className="text-red-400 text-sm">Error loading analytics: {error.message}</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <MetricCard title="Execution Metrics" loading={isLoading}>
        <Metric label="Trades Attempted" value={data?.session.tradesAttempted} />
        <Metric label="Trades Executed" value={data?.session.tradesExecuted} />
        <Metric label="Success Rate" value={`${(data?.session.successRate * 100).toFixed(1)}%`} />
        <Metric label="Avg Execution Time" value={`${data?.session.avgExecutionTime.toFixed(0)}ms`} />
        <Metric label="Total Volume" value={data?.session.totalVolume.toLocaleString()} />
      </MetricCard>

      <MetricCard title="Risk Metrics" loading={isLoading}>
        <Metric label="Drawdown" value={`${(data?.risk.currentDrawdown * 100).toFixed(2)}%`} />
        <Metric label="Open Positions" value={data?.risk.openPositions} />
        <Metric label="Exposure" value={`${(data?.risk.totalExposure * 100).toFixed(2)}%`} />
        <Metric label="Risk Level" value={data?.risk.riskLevel} />
      </MetricCard>

      <MetricCard title="Performance Metrics" loading={isLoading}>
        <Metric label="Win Rate" value={`${(data?.performance.winRate * 100).toFixed(1)}%`} />
        <Metric label="Avg Return" value={`${(data?.performance.avgReturn * 100).toFixed(2)}%`} />
        <Metric label="Sharpe Ratio" value={data?.performance.sharpeRatio.toFixed(2)} />
        <Metric label="Profit Factor" value={data?.performance.profitFactor.toFixed(2)} />
        <Metric label="Total P&L" value={`$${data?.performance.totalPnL.toFixed(2)}`} />
      </MetricCard>

      <MetricCard title="AI Learning Insights" loading={isLoading}>
        <Metric label="Accuracy Rate" value={`${(data?.learning.accuracyRate * 100).toFixed(1)}%`} />
        <Metric label="Patterns Matched" value={data?.learning.patternMatchCount} />
        <Metric label="Threshold Adjustments" value={data?.learning.thresholdAdjustments} />
        <Metric label="Last Update" value={new Date(data?.learning.lastLearningUpdate).toLocaleString()} />
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


