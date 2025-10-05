'use client'

import { useAlpacaAccount, useAlpacaPositions } from '@/hooks/api/useAlpacaData'
import PortfolioOverview from '@/components/dashboard/PortfolioOverview'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Bot,
  Zap,
  BarChart3,
  PieChart,
  Wallet
} from 'lucide-react'
import EnvironmentDashboard from '@/components/dashboard/EnvironmentDashboard'
import LiveAIActivity from '@/components/dashboard/LiveAIActivity'

export default function DashboardPage() {
  // ✅ Destructure query results
  const {
    data: account,
    isLoading: accountLoading,
    error: accountError
  } = useAlpacaAccount()

  const {
    data: positions,
    isLoading: positionsLoading,
    error: positionsError
  } = useAlpacaPositions()

  // ✅ Normalize positions into an array
  const positionsArray = Array.isArray(positions)
    ? positions
    : positions
      ? [positions]
      : []

  // ✅ Calculate key metrics safely
  const totalBalance = account ? parseFloat(account.equity) : 0
  const buyingPower = account ? parseFloat(account.buying_power) : 0

  const investedAmount = positionsArray.reduce(
    (total, pos) => total + (parseFloat(pos.market_value) || 0),
    0
  )

  const totalPnL = positionsArray.reduce(
    (total, pos) => total + (parseFloat(pos.unrealized_pl) || 0),
    0
  )

  const dayPnL = account
    ? parseFloat(account.portfolio_value || '0') -
    parseFloat(account.last_equity || '0')
    : 0

  const pnlPercentage = totalBalance > 0 ? (totalPnL / totalBalance) * 100 : 0

  // ✅ Portfolio cards
  const portfolioCards = [
    {
      title: 'Portfolio Value',
      value: totalBalance,
      change: dayPnL,
      changePercent: totalBalance > 0 ? (dayPnL / totalBalance) * 100 : 0,
      subtitle: 'Total equity',
      icon: Wallet,
      gradient: 'from-blue-500 to-cyan-400'
    },
    {
      title: 'Total Return',
      value: totalPnL,
      change: totalPnL,
      changePercent: pnlPercentage,
      subtitle: 'Unrealized P&L',
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
      gradient:
        totalPnL >= 0
          ? 'from-green-500 to-emerald-400'
          : 'from-red-500 to-rose-400'
    },
    {
      title: 'Buying Power',
      value: buyingPower,
      subtitle: 'Available to trade',
      icon: DollarSign,
      gradient: 'from-purple-500 to-violet-400'
    },
    {
      title: 'Positions',
      value: positionsArray.length,
      subtitle: 'Active holdings',
      icon: PieChart,
      gradient: 'from-orange-500 to-amber-400',
      isCount: true
    }
  ]

  const quickActions = [
    {
      title: 'AI Trading Bot',
      description: 'Start automated trading',
      href: '/',
      icon: Bot,
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      title: 'My Positions',
      description: 'View all holdings',
      href: '/positions',
      icon: TrendingUp,
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'hover:from-green-600 hover:to-green-700'
    },
    {
      title: 'Trading History',
      description: 'Past orders & trades',
      href: '/orders',
      icon: BarChart3,
      gradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'hover:from-purple-600 hover:to-purple-700'
    }
  ]

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)

const formatPercentage = (value?: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '--%'; // or '--' if you prefer a placeholder
  }
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="space-y-8 p-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Portfolio
            </h1>
            <p className="text-gray-400 mt-2 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Real-time market data
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2">
              <span className="text-blue-400 text-sm font-medium">
                Paper Trading
              </span>
            </div>
          </div>
        </div>
        

        {/* Portfolio Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {portfolioCards.map((card, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.gradient} flex items-center justify-center shadow-lg`}
                >
                  <card.icon size={24} className="text-white" />
                </div>
                {card.change !== undefined && (
                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${card.change >= 0
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                      }`}
                  >
                    {card.change >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    <span>{formatPercentage(card.changePercent)}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-gray-400 text-sm font-medium">
                  {card.title}
                </h3>
                <div className="text-2xl font-bold text-white">
                  {accountLoading || positionsLoading ? (
                    <div className="animate-pulse bg-gray-600 h-8 w-24 rounded-lg"></div>
                  ) : card.isCount ? (
                    card.value
                  ) : (
                    formatCurrency(card.value)
                  )}
                </div>
                <p className="text-gray-500 text-sm">{card.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Portfolio Overview */}
          <div className="xl:col-span-2 space-y-6">
            <PortfolioOverview
              portfolio={account}
              positions={positionsArray}
              isLoading={accountLoading || positionsLoading}
              error={(accountError || positionsError)?.message || null}
            />

            {/* Live AI Activity Feed */}
            <LiveAIActivity />
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Zap size={20} className="text-yellow-400" />
                <h3 className="text-xl font-bold text-white">Quick Actions</h3>
              </div>
              <div className="space-y-4">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    href={action.href}
                    className={`relative group bg-gradient-to-r ${action.gradient} ${action.hoverGradient} text-white p-4 rounded-xl transition-all duration-300 flex items-center justify-between overflow-hidden shadow-lg hover:shadow-xl hover:scale-105`}
                  >
                    <div className="flex items-center space-x-3 relative z-10">
                      <action.icon size={20} />
                      <div>
                        <div className="font-semibold">{action.title}</div>
                        <div className="text-sm opacity-90">
                          {action.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform relative z-10"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Market Status */}
            <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-3">
                <AlertCircle size={18} className="text-blue-400" />
                <span className="text-blue-400 font-semibold">Market Status</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                You're trading in <span className="font-semibold text-blue-400">paper mode</span>.
                All trades are simulated with virtual money for safe learning.
              </p>
              <div className="mt-4 flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400">Markets Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
