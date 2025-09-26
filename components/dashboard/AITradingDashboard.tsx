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

  // Calculate financial metrics
  const totalBalance = account.data ? parseFloat(account.data.equity) : 0
  const buyingPower = account.data ? parseFloat(account.data.buying_power) : 0
  const investedAmount = positions.data ? positions.data.reduce((total, pos) => total + (parseFloat(pos.market_value) || 0), 0) : 0
  const totalPnL = positions.data ? positions.data.reduce((total, pos) => total + (parseFloat(pos.unrealized_pl) || 0), 0) : 0
  const dayPnL = account.data ? parseFloat(account.data.portfolio_value || '0') - parseFloat(account.data.last_equity || '0') : 0

  return (
    <DashboardLayout
      isLiveTrading={false}
      onToggleMode={() => {}}
      botStatus="STOPPED"
    >
         {/* AI Trading Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
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

            {/* AI Trading Bot Button */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-6">
                <div className={`flex items-center space-x-2`}>
                  <div className={`w-3 h-3 rounded-full ${
                    tradingBot.metrics.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                  }`} />
                  <span className={`text-md font-medium ${
                    tradingBot.metrics.isRunning ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {tradingBot.metrics.isRunning ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  onClick={tradingBot.metrics.isRunning ? handleStop : () => handleStart(defaultBotConfig)}
                  className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    tradingBot.metrics.isRunning
                      ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                      : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                  }`}
                >
                  {tradingBot.metrics.isRunning ? 'Stop' : 'Start'} AI Bot
                </button>
              </div>
            </div>
          </div>


      {/* AI Trading Bot Control with Portfolio Metrics and Activity Feed */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-xl p-6 shadow-2xl">

          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
                <span className="text-gray-300 text-sm font-medium">Total Balance</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {account.isLoading ? (
                  <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                ) : (
                  `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Buying Power: ${buyingPower.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                <span className="text-gray-300 text-sm font-medium">Invested Amount</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {positions.isLoading ? (
                  <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                ) : (
                  `$${investedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {positions.data ? `${positions.data.length} positions` : 'No positions'}
              </div>
            </div>

            <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"/>
                </svg>
                <span className="text-gray-300 text-sm font-medium">Total P&L</span>
              </div>
              <div className="text-2xl font-bold">
                {positions.isLoading || account.isLoading ? (
                  <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                ) : (
                  <span className={totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Today: {dayPnL >= 0 ? '+' : ''}${dayPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

     

          {/* Integrated AI Bot Activity Feed and Trading Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AI Bot Activity Feed */}
            <div className="bg-gray-900/30 rounded-lg border border-gray-700/50 h-96">
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <h4 className="text-lg font-semibold text-white">AI Bot Activity</h4>
                </div>
              </div>
              <div className="p-4 h-80 overflow-y-auto">
                {aiActivity.activities.length > 0 || aiActivity.isSimulating ? (
                  <AIBotActivity
                    refreshInterval={5000}
                    maxActivities={6}
                    showControls={false}
                    compact={true}
                  />
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                    </svg>
                    <div className="text-gray-400 text-sm">
                      Activity feed will appear here when AI Trading is started
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Live Trades Table */}
            <div>
              <AILiveTradesTable
                maxItems={8}
                compact={true}
                showHeader={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PortfolioOverview
          portfolio={account.data}
          positions={positions.data}
          isLoading={account.isLoading || positions.isLoading}
          error={account.error || positions.error}
        />
      </div>

      {/* All Trades and Orders Section */}
      <div className="mb-8">
        <div className="bg-gray-900/40 rounded-lg border border-gray-700/50 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"/>
            </svg>
            <h3 className="text-lg font-semibold text-white">All Trading Activity</h3>
            <span className="text-xs text-gray-500">(Manual + AI Trades)</span>
          </div>
          <TradesOrdersTable
            maxItems={15}
            compact={false}
            showTrades={true}
            showOrders={true}
            useRealData={true}
          />
        </div>
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