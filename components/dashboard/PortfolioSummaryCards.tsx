"use client"

import { DollarSign, TrendingUp, Wallet, Activity, BarChart3, AlertCircle } from 'lucide-react'
import { useAlpacaAccount } from '@/hooks/api/useAlpacaData'
import { ClientSafeTime } from '@/components/ui/ClientSafeTime'

interface PortfolioSummaryCardsProps {
  refreshInterval?: number
}

export default function PortfolioSummaryCards({ refreshInterval = 5000 }: PortfolioSummaryCardsProps) {
  const { data: account, isLoading, error } = useAlpacaAccount(refreshInterval)

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load account data</span>
        </div>
      </div>
    )
  }

  const equity = parseFloat(account?.equity || '0')
  const buyingPower = parseFloat(account?.buying_power || account?.buyingPower || '0')
  const cash = parseFloat(account?.cash || '0')
  const dailyPnL = parseFloat(account?.equity_previous_close || account?.equityPreviousClose || equity) - equity
  const dailyPnLPercent = equity > 0 ? (dailyPnL / equity) * 100 : 0
  const dayTradeCount = parseInt(account?.daytrade_count || account?.daytradeCount || '0')
  const patternDayTrader = account?.pattern_day_trader || account?.patternDayTrader || false

  const stats = [
    {
      label: 'Total Balance',
      value: equity,
      format: 'currency',
      icon: DollarSign,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500/30'
    },
    {
      label: 'Buying Power',
      value: buyingPower,
      format: 'currency',
      icon: Wallet,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30'
    },
    {
      label: 'Cash',
      value: cash,
      format: 'currency',
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500/30'
    },
    {
      label: 'Daily Change',
      value: dailyPnL,
      format: 'currency',
      percent: dailyPnLPercent,
      icon: TrendingUp,
      color: dailyPnL >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: dailyPnL >= 0 ? 'bg-green-900/20' : 'bg-red-900/20',
      borderColor: dailyPnL >= 0 ? 'border-green-500/30' : 'border-red-500/30'
    },
    {
      label: 'Day Trade Count',
      value: dayTradeCount,
      format: 'number',
      icon: BarChart3,
      color: dayTradeCount >= 3 ? 'text-orange-400' : 'text-gray-400',
      bgColor: dayTradeCount >= 3 ? 'bg-orange-900/20' : 'bg-gray-900/20',
      borderColor: dayTradeCount >= 3 ? 'border-orange-500/30' : 'border-gray-500/30',
      badge: patternDayTrader ? 'PDT' : undefined
    }
  ]

  const formatValue = (value: number, format: string) => {
    if (format === 'currency') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Portfolio Summary</h2>
        <div className="text-xs text-gray-400">
          Last updated: <ClientSafeTime timestamp={new Date()} format="time" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-xl p-4 transition-all hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.badge && (
                <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                  {stat.badge}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-400">{stat.label}</div>
              {isLoading ? (
                <div className="animate-pulse bg-gray-600 h-7 w-24 rounded"></div>
              ) : (
                <div className="flex items-baseline space-x-2">
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {formatValue(stat.value, stat.format)}
                  </div>
                  {stat.percent !== undefined && (
                    <div className={`text-sm ${stat.color}`}>
                      ({stat.percent >= 0 ? '+' : ''}{stat.percent.toFixed(2)}%)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
