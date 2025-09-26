"use client"
// Dashboard Container (Layout)

import { useAutoExecution } from "@/hooks/trading/useAutoExecution"
import { useTradingBot } from "@/hooks/trading/useTradingBot"
import { useAlpacaAccount, useAlpacaPositions } from "@/hooks/api/useAlpacaData"
import { BotControlPanel } from "../trading/BotControlPanel"
import AIRecommendationsList from "./AIRecommendationsList"

import PortfolioOverview from "./PortfolioOverview"
import DashboardLayout from "./DashboardLayout"

export default function AITradingDashboard() {
  const tradingBot = useTradingBot()
  const autoExecution = useAutoExecution(tradingBot.engine)
  const account = useAlpacaAccount()
  const positions = useAlpacaPositions()

  return (
    <>
    <DashboardLayout
      isLiveTrading={false}
      onToggleMode={() => {}}
      botStatus="STOPPED"
    >
      {/* AI Trading Bot Control - Main Feature Spotlight */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center space-x-3 mb-4">
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
          <BotControlPanel
            status={tradingBot.status}
            onStart={tradingBot.startBot}
            onStop={tradingBot.stopBot}
          />
        </div>
      </div>

      <PortfolioOverview
        portfolio={account.data}
        positions={positions.data}
        isLoading={account.isLoading || positions.isLoading}
        error={account.error || positions.error}
      />

      <AIRecommendationsList
        recommendations={[]}
        onExecuteRecommendation={async (rec) => {
          console.log('Executing recommendation:', rec)
          // TODO: Implement actual execution logic
        }}
        isLoading={false}
      />
    </DashboardLayout>
    </>
  )
}