"use client"
// Dashboard Container (Layout)

import { useAutoExecution } from "@/hooks/trading/useAutoExecution"
import { useTradingBot } from "@/hooks/trading/useTradingBot"
import { useAlpacaAccount, useAlpacaPositions } from "@/hooks/api/useAlpacaData"
import { BotControlPanel } from "../trading/BotControlPanel"
import AIRecommendationsList from "./AIRecommendationsList"
import AIBotActivity from "./AIBotActivity"
import useAIBotActivity from "@/hooks/useAIBotActivity"
import TradesOrdersTable from "./TradesOrdersTable"
import AILiveTradesTable from "./AILiveTradesTable"

import PortfolioOverview from "./PortfolioOverview"
import DashboardLayout from "./DashboardLayout"

// Default bot configuration
const defaultBotConfig = {
  alpaca: {
    baseUrl: 'https://paper-api.alpaca.markets',
    apiKey: process.env.NEXT_PUBLIC_ALPACA_API_KEY || '',
    secretKey: process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || ''
  },
  trading: {
    maxPositionSize: 10,
    riskLevel: 0.02
  },
  mode: 'BALANCED' as const,
  maxPositionSize: 10,
  stopLossPercent: 5,
  takeProfitPercent: 15,
  minimumConfidence: 75,
  watchlistSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
}

export default function AITradingDashboard() {
  const tradingBot = useTradingBot()
  const autoExecution = useAutoExecution(tradingBot.engine)
  const account = useAlpacaAccount()
  const positions = useAlpacaPositions()
  const aiActivity = useAIBotActivity({
    refreshInterval: 5000,
    maxActivities: 8,
    autoStart: false
  })

  // Enhanced start function that starts both bot and activity monitoring
  const handleStart = async (config: any) => {
    await tradingBot.startBot(config)
    await aiActivity.startSimulation()
  }

  // Enhanced stop function that stops both bot and activity monitoring
  const handleStop = async () => {
    await tradingBot.stopBot()
    await aiActivity.stopSimulation()
  }

  // Calculate financial metrics with proper error handling
  const totalBalance = account.data ? parseFloat(account.data.equity || account.data.portfolio_value || '0') : 0
  const buyingPower = account.data ? parseFloat(account.data.buying_power || '0') : 0
  const investedAmount = positions.data ? positions.data.reduce((total, pos) => total + (parseFloat(pos.market_value || pos.marketValue || '0')), 0) : 0
  const totalPnL = positions.data ? positions.data.reduce((total, pos) => total + (parseFloat(pos.unrealized_pl || pos.unrealizedPnL || '0')), 0) : 0
  const dayPnL = account.data ? parseFloat(account.data.dayPnL || account.data.day_pnl || '0') : 0

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0)
  }

  // Format percentage helper
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
  }

  // Format last updated time
  const formatLastUpdated = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    })
  }

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
         {/* AI Trading Engine Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AI Trading Engine</h2>
              <p className="text-gray-300">Advanced algorithmic trading powered by machine learning</p>
            </div>
          </div>


      {/* Main Dashboard Layout with Right Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">

        {/* Main Content Area (3 columns) */}
        <div className="xl:col-span-3">
          {/* AI Trading Bot Control with Portfolio Metrics and Trading Activity */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-xl p-6 shadow-2xl">

            {/* Key Financial Metrics */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Portfolio Overview</h3>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className={`w-2 h-2 rounded-full ${account.isLoading || positions.isLoading ? 'bg-yellow-400 animate-pulse' : account.error || positions.error ? 'bg-red-400' : 'bg-green-400'}`}></div>
                <span>
                  {account.isLoading || positions.isLoading ? 'Updating...' :
                   account.error || positions.error ? 'Connection error' :
                   'Live data connected'}
                </span>
                <span className="text-gray-500">•</span>
                <span>Refreshes every 5s</span>
                <span className="text-gray-500">•</span>
                <span>Last updated: {formatLastUpdated()}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

              <div className={`bg-gray-900/40 rounded-lg p-4 border border-gray-700/50 transition-all duration-300 ${positions.isLoading ? 'ring-2 ring-blue-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    <span className="text-gray-300 text-sm font-medium">Invested Amount</span>
                  </div>
                  {positions.isLoading && (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <div className="text-2xl font-bold text-white">
                  {positions.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                  ) : positions.error ? (
                    <span className="text-red-400 text-sm">Error loading</span>
                  ) : (
                    formatCurrency(investedAmount)
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {positions.isLoading ? 'Loading...' : positions.data ? `${positions.data.length} active positions` : 'No positions'}
                </div>
              </div>

              <div className={`bg-gray-900/40 rounded-lg p-4 border border-gray-700/50 transition-all duration-300 ${(positions.isLoading || account.isLoading) ? 'ring-2 ring-yellow-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"/>
                    </svg>
                    <span className="text-gray-300 text-sm font-medium">Total P&L</span>
                  </div>
                  {(positions.isLoading || account.isLoading) && (
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <div className="text-2xl font-bold">
                  {positions.isLoading || account.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                  ) : (positions.error || account.error) ? (
                    <span className="text-red-400 text-sm">Error loading</span>
                  ) : (
                    <span className={totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {account.isLoading ? 'Loading daily P&L...' : `Today: ${dayPnL >= 0 ? '+' : ''}${formatCurrency(dayPnL)}`}
                </div>
              </div>

              <div className={`bg-gray-900/40 rounded-lg p-4 border border-gray-700/50 transition-all duration-300 ${account.isLoading ? 'ring-2 ring-green-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                    </svg>
                    <span className="text-gray-300 text-sm font-medium">Total Balance</span>
                  </div>
                  {account.isLoading && (
                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <div className="text-2xl font-bold text-white">
                  {account.isLoading ? (
                    <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                  ) : account.error ? (
                    <span className="text-red-400 text-sm">Error loading</span>
                  ) : (
                    formatCurrency(totalBalance)
                  )}
                </div>
                <div className="text-xs text-green-400 mt-1">
                  {account.isLoading ? 'Loading buying power...' : `Buying Power: ${formatCurrency(buyingPower)}`}
                </div>
              </div>
            </div>

            {/* All Trading Activity (Manual + AI Trades) */}
            <div className="bg-gray-900/30 rounded-lg border border-gray-700/50">
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"/>
                  </svg>
                  <h4 className="text-lg font-semibold text-white">All Trading Activity</h4>
                  <span className="text-xs text-gray-500">(Manual + AI Trades)</span>
                </div>
              </div>
              <div className="p-4">
                <TradesOrdersTable
                  maxItems={10}
                  compact={true}
                  showTrades={true}
                  showOrders={true}
                  useRealData={true}
                  defaultTab="orders"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar (1 column) - AI Bot Activity */}
        <div className="xl:col-span-1">
          <div className="bg-gray-900/40 rounded-lg border border-gray-700/50 h-fit sticky top-4">
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <h4 className="text-lg font-semibold text-white">AI Bot Activity</h4>
              </div>
            </div>
            <div className="p-4">
              <AIBotActivity
                refreshInterval={5000}
                maxActivities={12}
                showControls={true}
                compact={true}
                botIsRunning={tradingBot.metrics.isRunning}
                onStartBot={() => handleStart(defaultBotConfig)}
                onStopBot={handleStop}
              />
            </div>

            {/* AI Live Trades in Sidebar */}
            <div className="border-t border-gray-700/50">
              <AILiveTradesTable
                maxItems={6}
                compact={true}
                showHeader={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <PortfolioOverview
          portfolio={account.data}
          positions={positions.data}
          isLoading={account.isLoading || positions.isLoading}
          error={account.error || positions.error}
        />
      </div>

      <AIRecommendationsList
        recommendations={[]}
        onExecuteRecommendation={async (rec) => {
          console.log('Executing recommendation:', rec)
          // TODO: Implement actual execution logic
        }}
        isLoading={false}
      />
    </DashboardLayout>
  )
}