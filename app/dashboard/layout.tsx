'use client'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { useTradingBot } from '@/hooks/trading/useTradingBot'
import { useAlpacaAccount, useAlpacaPositions } from '@/hooks/api/useAlpacaData'

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const tradingBot = useTradingBot()
  const account = useAlpacaAccount()
  const positions = useAlpacaPositions()

  // Calculate financial metrics
  const totalBalance = account.data ? parseFloat(account.data.equity) : 0
  const totalPnL = positions.data ? positions.data.reduce((total, pos) => total + (parseFloat(pos.unrealized_pl) || 0), 0) : 0
  const dayPnL = account.data ? parseFloat(account.data.portfolio_value || '0') - parseFloat(account.data.last_equity || '0') : 0

  // Create proper BotMetrics object
  const botMetrics = {
    isRunning: tradingBot.metrics.isRunning || false,
    uptime: tradingBot.metrics.uptime || 0,
    tradesExecuted: tradingBot.metrics.tradesExecuted || 0,
    recommendationsGenerated: tradingBot.metrics.recommendationsGenerated || 0,
    successRate: tradingBot.metrics.successRate || 0,
    totalPnL: totalPnL,
    dailyPnL: dayPnL,
    riskScore: tradingBot.metrics.riskScore || 0,
    lastActivity: tradingBot.metrics.lastActivity
  }

  return (
    <DashboardLayout
      isLiveTrading={false}
      onToggleMode={() => {}}
      botStatus={botMetrics}
    >
      {children}
    </DashboardLayout>
  )
}