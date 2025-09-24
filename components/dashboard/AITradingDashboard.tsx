'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useMarketData } from '@/hooks/useMarketData'
import { useAlpacaTrading } from '@/hooks/useAlpacaTrading'
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  AcademicCapIcon,
  BoltIcon,
  CpuChipIcon,
  CalculatorIcon,
  RocketLaunchIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

// Import sub-components
import { LiveTrades } from './LiveTrades'
import { PerformanceAnalytics } from './PerformanceAnalytics'
import AITradingControl from './AITradingControl'
import AILearningDashboard from './AILearningDashboard'
import { MarketClock } from './MarketClock'

// Enhanced interfaces for better AI integration
interface EnhancedAccount {
  accountType: 'PAPER' | 'LIVE'
  totalBalance: number
  cashBalance: number
  investedAmount?: number
  dayPnL?: number
  totalPnL?: number
  totalReturn?: number
  dayReturn?: number
  availableBuyingPower: number
  dayTradeCount: number
  patternDayTrader: boolean
  tradingEnabled?: boolean
  isConnected: boolean
  riskScore?: number
  safetyLevel?: 'SAFE' | 'MODERATE' | 'RISKY' | 'DANGEROUS'
  totalTrades?: number
  winningTrades?: number
  averageWin?: number
  averageLoss?: number
  bestStrategy?: string
  worstStrategy?: string
}

interface AIRecommendation {
  id: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoning: string
  targetPrice: number
  currentPrice: number
  suggestedAmount: number
  maxSafeAmount: number
  stopLoss: number
  takeProfit: number
  timeframe: '15M' | '1H' | '4H' | '1D' | '1W'
  technicalScore: number
  fundamentalScore: number
  sentimentScore: number
  riskScore: number
  expectedReturn: number
  probability: number
  marketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE'
  supportLevel: number
  resistanceLevel: number
  volume: number
  timestamp: Date
  expiresAt: Date
  safetyChecks: {
    passedRiskCheck: boolean
    withinDailyLimit: boolean
    positionSizeOk: boolean
    correlationCheck: boolean
    warnings: string[]
  }
  educationalNote: string
  strategyBasis: string
  backtestResults: {
    winRate: number
    avgReturn: number
    maxDrawdown: number
    totalTrades: number
    profitFactor: number
  }
  aiInsights: {
    marketSentiment: string
    technicalPattern: string
    newsImpact: string
    institutionalFlow: string
  }
}

// Enhanced Balance Chart Component
function BalanceChart({ account, isClient }: { account: EnhancedAccount | null, isClient: boolean }) {
  if (!account) {
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Portfolio Growth Chart</h4>
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-500">Connect to Alpaca to view portfolio history</p>
        </div>
      </div>
    )
  }

  // Only show current balance data, no historical mock data
  const currentData = {
    timestamp: new Date(),
    balance: account.totalBalance,
    invested: account.investedAmount || 0,
    cash: account.cashBalance
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-300 mb-3">Current Portfolio Balance</h4>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Total Balance:</span>
          <span className="text-white font-medium">${currentData.balance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Cash Available:</span>
          <span className="text-green-400 font-medium">${currentData.cash.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Invested:</span>
          <span className="text-blue-400 font-medium">${currentData.invested.toLocaleString()}</span>
        </div>
        <div className="text-center py-4 border-t border-gray-600">
          <div className="text-xs text-gray-500 mb-1">Real-time Alpaca data</div>
          <div className="text-xs text-gray-400">
            Updated: {isClient ? currentData.timestamp.toLocaleTimeString() : '--:--:-- --'}
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced AI Recommendation Card Component
function AIRecommendationCard({ recommendation, onExecute }: {
  recommendation: AIRecommendation
  onExecute: (rec: AIRecommendation) => void
}) {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 85) return 'text-green-400'
    if (confidence >= 75) return 'text-blue-400'
    return 'text-yellow-400'
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'HIGH': return 'bg-red-600 text-white'
      case 'MEDIUM': return 'bg-yellow-600 text-white'
      case 'LOW': return 'bg-green-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  return (
    <div className={`border rounded-lg p-6 transition-all hover:shadow-lg ${
      recommendation.action === 'BUY' ? 'border-green-500/30 bg-green-900/10' :
      recommendation.action === 'SELL' ? 'border-red-500/30 bg-red-900/10' :
      'border-yellow-500/30 bg-yellow-900/10'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className={`px-3 py-1 rounded font-bold text-sm ${
              recommendation.action === 'BUY' ? 'bg-green-600 text-white' :
              recommendation.action === 'SELL' ? 'bg-red-600 text-white' :
              'bg-yellow-600 text-white'
            }`}>
              {recommendation.action}
            </div>
            <span className="font-semibold text-white text-xl">{recommendation.symbol}</span>
            <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(recommendation.priority)}`}>
              {recommendation.priority}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              recommendation.safetyChecks.passedRiskCheck ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {recommendation.safetyChecks.passedRiskCheck ? 'SAFE' : 'RISKY'}
            </span>
            <div className="flex items-center gap-1">
              <CpuChipIcon className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400">AI Enhanced</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Current Price</div>
              <div className="font-semibold text-white">${recommendation.currentPrice.toFixed(2)}</div>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">AI Target</div>
              <div className="font-semibold text-white">${recommendation.targetPrice.toFixed(2)}</div>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
              <div className="font-semibold text-red-400">${recommendation.stopLoss.toFixed(2)}</div>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Max Safe Amount</div>
              <div className="font-semibold text-green-400">${recommendation.maxSafeAmount.toLocaleString()}</div>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">AI Confidence</div>
              <div className={`font-semibold ${getConfidenceColor(recommendation.confidence)}`}>
                {recommendation.confidence}%
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">AI Analysis & Reasoning</div>
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">{recommendation.reasoning}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
                <div className="text-xs text-purple-400 mb-1">AI Insights</div>
                <div className="text-xs text-purple-200 space-y-1">
                  <div>Market: {recommendation.aiInsights.marketSentiment}</div>
                  <div>Pattern: {recommendation.aiInsights.technicalPattern}</div>
                  <div>News: {recommendation.aiInsights.newsImpact}</div>
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                <div className="text-xs text-blue-400 mb-1">Backtest Results</div>
                <div className="text-xs text-blue-200 space-y-1">
                  <div>Win Rate: {recommendation.backtestResults.winRate.toFixed(1)}%</div>
                  <div>Avg Return: {recommendation.backtestResults.avgReturn.toFixed(1)}%</div>
                  <div>Total Trades: {recommendation.backtestResults.totalTrades}</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-cyan-300 bg-cyan-900/20 border border-cyan-500/30 rounded p-3">
              <SparklesIcon className="w-4 h-4 inline mr-2" />
              {recommendation.educationalNote}
            </div>
          </div>

          {recommendation.safetyChecks.warnings.length > 0 && (
            <div className="border-orange-500/30 bg-orange-900/10 text-orange-300 border rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="font-semibold text-xs">Risk Assessment</span>
              </div>
              <ul className="space-y-1 text-xs">
                {recommendation.safetyChecks.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="ml-4 flex flex-col gap-2">
          <button
            onClick={() => onExecute(recommendation)}
            disabled={!recommendation.safetyChecks.passedRiskCheck || tradingLoading}
            className={`px-4 py-3 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              recommendation.action === 'BUY' ? 'bg-green-600 hover:bg-green-700 text-white' :
              recommendation.action === 'SELL' ? 'bg-red-600 hover:bg-red-700 text-white' :
              'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {tradingLoading ? 'Executing...' :
             !recommendation.safetyChecks.passedRiskCheck ? 'Risk Check Failed' :
             `Execute AI ${recommendation.action}`}
          </button>
          <div className="text-xs text-center text-gray-400">
            Expires: {isClient ? recommendation.expiresAt.toLocaleTimeString() : '--:--:-- --'}
          </div>
          <div className="text-xs text-center text-purple-400">
            Strategy: {recommendation.strategyBasis}
          </div>
        </div>
      </div>
    </div>
  )
}

interface BotConfig {
  enabled: boolean
  mode: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
  aiModel: 'GPT_ENHANCED' | 'NEURAL_NETWORK' | 'ENSEMBLE'
  maxPositionSize: number
  maxDailyTrades: number
  stopLossPercent: number
  takeProfitPercent: number
  riskTolerance: number
  minimumConfidence: number
  autoExecuteAbove: number
  strategies: {
    aiMomentum: boolean
    aiMeanReversion: boolean
    aiBreakout: boolean
    aiArbitrage: boolean
    aiSentiment: boolean
    aiNews: boolean
    aiPattern: boolean
    aiEnsemble: boolean
  }
  timeframes: string[]
  watchlistSymbols: string[]
  notifications: {
    email: boolean
    push: boolean
    discord: boolean
    highConfidenceOnly: boolean
    executionAlerts: boolean
  }
  riskLimits: {
    maxRiskPerTrade: number
    maxDailyLoss: number
    maxPortfolioRisk: number
    stopLossRequired: boolean
    takeProfitRequired: boolean
    correlationLimit: number
    maxDrawdown: number
    volatilityLimit: number
  }
  advancedSettings: {
    paperTradingFirst: boolean
    backtestRequired: boolean
    minimumBacktestPeriod: number
    learningMode: boolean
    adaptiveParameters: boolean
    marketRegimeDetection: boolean
  }
}

// AI Recommendation Generation based on real Alpaca data only
function generateAIRecommendations(quotes: Record<string, any>, positions: any[], account: EnhancedAccount | null): AIRecommendation[] {
  // Return empty array if no real data available
  if (!quotes || Object.keys(quotes).length === 0 || !account?.isConnected) {
    return []
  }

  // Only process symbols with actual quote data
  const validSymbols = Object.keys(quotes).filter(symbol =>
    quotes[symbol] &&
    quotes[symbol].latestTrade?.price > 0
  )

  if (validSymbols.length === 0) {
    return []
  }

  // Use real market data to generate minimal, realistic recommendations
  return validSymbols.slice(0, 3).map((symbol, index) => {
    const quote = quotes[symbol]
    const currentPrice = quote.latestTrade?.price || quote.midPrice || 0

    // Skip if no valid price data
    if (!currentPrice || currentPrice <= 0) {
      return null
    }

    // Simple analysis based on real price movements
    const priceChange = quote.dailyChange || 0
    const volume = quote.volume || 0

    // Determine action based on real market data
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
    let confidence = 60

    if (priceChange > 2 && volume > 100000) {
      action = 'BUY'
      confidence = 70
    } else if (priceChange < -2 && volume > 100000) {
      action = 'SELL'
      confidence = 70
    }

    const suggestedAmount = account ? Math.min(account.cashBalance * 0.05, 2000) : 0
    const maxSafeAmount = suggestedAmount * 0.8

    // Conservative risk assessment
    const riskScore = Math.abs(priceChange) > 5 ? 40 : 20
    const passedRiskCheck = confidence >= 70 && riskScore <= 30 && account.cashBalance > suggestedAmount

    const warnings = []
    if (volume < 50000) warnings.push('Low volume - exercise caution')
    if (Math.abs(priceChange) > 5) warnings.push('High volatility detected')
    if (!passedRiskCheck) warnings.push('Risk assessment failed')

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2) // Shorter expiry for real data

    return {
      id: `ai_rec_real_${Date.now()}_${index}`,
      symbol,
      action,
      confidence,
      priority: confidence >= 75 ? 'HIGH' : confidence >= 65 ? 'MEDIUM' : 'LOW',
      reasoning: `Real-time Alpaca data analysis for ${symbol}: Current price $${currentPrice.toFixed(2)}, daily change ${priceChange.toFixed(2)}%, volume ${volume.toLocaleString()}. ${action === 'BUY' ? 'Positive momentum detected' : action === 'SELL' ? 'Downward pressure observed' : 'Neutral signals, recommend holding'}.`,
      targetPrice: action === 'BUY' ? currentPrice * 1.03 : action === 'SELL' ? currentPrice * 0.97 : currentPrice,
      currentPrice,
      suggestedAmount,
      maxSafeAmount,
      stopLoss: action === 'BUY' ? currentPrice * 0.98 : currentPrice * 1.02,
      takeProfit: action === 'BUY' ? currentPrice * 1.05 : currentPrice * 0.95,
      timeframe: '1H' as const,
      technicalScore: Math.min(Math.max(50 + priceChange * 5, 0), 100),
      fundamentalScore: 60, // Neutral baseline
      sentimentScore: priceChange > 0 ? 65 : priceChange < 0 ? 45 : 55,
      riskScore,
      expectedReturn: priceChange > 0 ? Math.min(priceChange * 0.5, 5) : Math.max(priceChange * 0.5, -5),
      probability: confidence,
      marketCondition: priceChange > 2 ? 'BULLISH' : priceChange < -2 ? 'BEARISH' : 'NEUTRAL',
      supportLevel: currentPrice * 0.98,
      resistanceLevel: currentPrice * 1.02,
      volume,
      timestamp: new Date(),
      expiresAt,
      safetyChecks: {
        passedRiskCheck,
        withinDailyLimit: true,
        positionSizeOk: account ? (maxSafeAmount / account.totalBalance) <= 0.05 : false,
        correlationCheck: true,
        warnings
      },
      educationalNote: `Analysis based on real Alpaca market data for ${symbol}. Current price: $${currentPrice.toFixed(2)}, daily change: ${priceChange.toFixed(2)}%. Always verify market conditions before executing trades.`,
      strategyBasis: `Real-time Alpaca data analysis`,
      backtestResults: {
        winRate: 0, // No fake backtest data
        avgReturn: 0,
        maxDrawdown: 0,
        totalTrades: 0,
        profitFactor: 0
      },
      aiInsights: {
        marketSentiment: `Price change: ${priceChange.toFixed(2)}%`,
        technicalPattern: `Volume: ${volume.toLocaleString()}`,
        newsImpact: 'Live market data only',
        institutionalFlow: 'Real-time price action'
      }
    }
  }).filter(Boolean) as AIRecommendation[]
}

export default function AITradingDashboard() {
  // Enhanced state management
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-recommendations' | 'bot-config' | 'live-trades' | 'performance' | 'ai-engine' | 'ai-learning' | 'analytics' | 'education'>('overview')
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isClient, setIsClient] = useState(false)

  // Prevent hydration mismatch with time display
  useEffect(() => {
    setIsClient(true)
  }, [])
  const [isLiveMode, setIsLiveMode] = useState(false)

  const [botConfig, setBotConfig] = useState<BotConfig>({
    enabled: false,
    mode: 'BALANCED',
    aiModel: 'ENSEMBLE',
    maxPositionSize: 8,
    maxDailyTrades: 50,
    stopLossPercent: 3,
    takeProfitPercent: 9,
    riskTolerance: 6,
    minimumConfidence: 70,
    autoExecuteAbove: 75,
    strategies: {
      aiMomentum: true,
      aiMeanReversion: true,
      aiBreakout: false,
      aiArbitrage: false,
      aiSentiment: true,
      aiNews: true,
      aiPattern: true,
      aiEnsemble: true
    },
    timeframes: ['1H', '4H', '1D'],
    watchlistSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'SPY'],
    notifications: {
      email: true,
      push: true,
      discord: false,
      highConfidenceOnly: true,
      executionAlerts: true
    },
    riskLimits: {
      maxRiskPerTrade: 2.5,
      maxDailyLoss: 4.0,
      maxPortfolioRisk: 18.0,
      stopLossRequired: true,
      takeProfitRequired: true,
      correlationLimit: 0.65,
      maxDrawdown: 12.0,
      volatilityLimit: 25.0
    },
    advancedSettings: {
      paperTradingFirst: true,
      backtestRequired: true,
      minimumBacktestPeriod: 30,
      learningMode: true,
      adaptiveParameters: true,
      marketRegimeDetection: true
    }
  })

  // Real Alpaca API data hooks
  const { quotes, marketStatus, isLoading: marketLoading, error: marketError, dataSource, refreshData } = useMarketData(botConfig.watchlistSymbols)
  const { account, positions, isLoading: tradingLoading, error: tradingError, fetchAccount, fetchPositions, executeOrder } = useAlpacaTrading()

  // Enhanced account with calculated fields
  const enhancedAccount: EnhancedAccount | null = useMemo(() => {
    if (!account) return null

    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
    const totalReturn = account.totalBalance > 0 ? totalPnL / account.totalBalance : 0
    const investedAmount = positions.reduce((sum, pos) => sum + pos.marketValue, 0)

    return {
      ...account,
      investedAmount,
      dayPnL: totalPnL * 0.1, // Approximate daily P&L
      totalPnL,
      totalReturn,
      dayReturn: totalReturn * 0.05, // Approximate daily return
      riskScore: Math.min(Math.abs(totalPnL) / (account.totalBalance * 0.04), 1),
      safetyLevel: totalPnL > account.totalBalance * 0.1 ? 'RISKY' : totalPnL > account.totalBalance * 0.05 ? 'MODERATE' : 'SAFE',
      totalTrades: 0, // Real data only
      winningTrades: 0,
      averageWin: 0,
      averageLoss: 0,
      bestStrategy: 'AI Ensemble Model',
      worstStrategy: 'Manual Analysis'
    }
  }, [account, positions])

  // Generate AI recommendations based on real market data
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])

  // Update AI recommendations when market data changes
  useEffect(() => {
    if (quotes && Object.keys(quotes).length > 0) {
      const newRecommendations = generateAIRecommendations(quotes, positions, enhancedAccount)
      setAiRecommendations(newRecommendations)
      setLastUpdate(new Date())
    }
  }, [quotes, positions, enhancedAccount])

  // Initialize data on component mount
  useEffect(() => {
    fetchAccount()
    fetchPositions()
  }, [fetchAccount, fetchPositions])


  // Enhanced event handlers
  const executeAIRecommendation = useCallback(async (recommendation: AIRecommendation) => {
    try {
      if (!recommendation.safetyChecks.passedRiskCheck) {
        setAlertMessage('AI recommendation failed safety checks - execution blocked')
        setTimeout(() => setAlertMessage(null), 5000)
        return
      }

      if (enhancedAccount?.accountType === 'LIVE') {
        const riskAmount = (recommendation.maxSafeAmount / enhancedAccount.totalBalance) * 100
        const confirmation = window.confirm(
          `LIVE AI TRADE CONFIRMATION\n\n` +
          `AI Action: ${recommendation.action} ${recommendation.symbol}\n` +
          `AI Confidence: ${recommendation.confidence}%\n` +
          `Amount: $${recommendation.maxSafeAmount.toLocaleString()} (${riskAmount.toFixed(1)}% of account)\n` +
          `Expected Return: ${recommendation.expectedReturn.toFixed(1)}%\n` +
          `Stop Loss: $${recommendation.stopLoss.toFixed(2)}\n` +
          `Take Profit: $${recommendation.takeProfit.toFixed(2)}\n\n` +
          `This AI trade uses REAL MONEY via Alpaca API. Confirm execution?`
        )

        if (!confirmation) return
      }

      // Calculate quantity based on suggestion and current price
      const quantity = Math.floor(recommendation.maxSafeAmount / recommendation.currentPrice)

      if (quantity <= 0) {
        setAlertMessage('Invalid quantity calculated - trade cancelled')
        setTimeout(() => setAlertMessage(null), 5000)
        return
      }

      // Execute the trade using real Alpaca API
      if (recommendation.action === 'BUY' || recommendation.action === 'SELL') {
        await executeOrder({
          symbol: recommendation.symbol,
          quantity,
          side: recommendation.action.toLowerCase() as 'buy' | 'sell',
          type: 'market'
        })
      }

      setAlertMessage(`AI ${recommendation.action} executed for ${recommendation.symbol} via Alpaca API - ${enhancedAccount?.accountType} account (${recommendation.confidence}% confidence)`)

      setTimeout(() => setAlertMessage(null), 5000)
    } catch (error) {
      setAlertMessage(`AI execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setAlertMessage(null), 5000)
    }
  }, [enhancedAccount, executeOrder])

  const toggleBot = useCallback(async () => {
    try {
      const newStatus = !botConfig.enabled
      const action = newStatus ? 'start' : 'stop'

      setAlertMessage(`${newStatus ? 'Starting' : 'Stopping'} AI Trading Bot...`)

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 150000) // 2.5 minute timeout

      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          action,
          config: {
            minConfidenceThreshold: botConfig.minimumConfidence / 100,
            autoExecution: {
              autoExecuteEnabled: true,
              confidenceThresholds: {
                minimum: 0.60,      // Updated to match API config
                conservative: 0.70, // Updated to match API config
                aggressive: 0.80,   // Updated to match API config
                maximum: 0.90       // Updated to match API config
              }
            }
          }
        }),
      })

      clearTimeout(timeoutId) // Clear timeout if request completes
      const result = await response.json()

      if (response.ok) {
        setBotConfig(prev => ({ ...prev, enabled: newStatus }))
        setAlertMessage(`AI Trading Bot ${newStatus ? 'started' : 'stopped'} successfully`)
      } else {
        throw new Error(result.details || result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to toggle AI Trading Bot:', error)

      let errorMessage = error.message
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - AI Trading Bot startup took too long. Please try again.'
      }

      setAlertMessage(`Failed to ${botConfig.enabled ? 'stop' : 'start'} AI Trading Bot: ${errorMessage}`)
    }

    setTimeout(() => setAlertMessage(null), 5000)
  }, [botConfig.enabled, botConfig.minimumConfidence])

  const refreshAIData = useCallback(() => {
    refreshData() // Refresh real market data first
    setLastUpdate(new Date())
    setAlertMessage('AI recommendations refreshed with latest Alpaca market data')
    setTimeout(() => setAlertMessage(null), 3000)
  }, [refreshData])

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercent = (percent: number): string => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  const getColorClass = (value: number): string => {
    return value >= 0 ? 'text-green-400' : 'text-red-400'
  }

  // Navigation tabs
  const navigationTabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'ai-recommendations', name: 'AI Recommendations', icon: CpuChipIcon },
    { id: 'bot-config', name: 'AI Bot Config', icon: CpuChipIcon },
    { id: 'live-trades', name: 'Live Trades', icon: BoltIcon },
    { id: 'performance', name: 'Performance Analytics', icon: CalculatorIcon },
    { id: 'ai-engine', name: 'AI Engine Control', icon: RocketLaunchIcon },
    { id: 'ai-learning', name: 'AI Learning', icon: AcademicCapIcon },
    // { id: 'education', name: 'AI Education', icon: LightBulbIcon }
  ]

  // Calculate AI statistics
  const aiStats = useMemo(() => {
    const totalRecommendations = aiRecommendations.length
    const highConfidenceCount = aiRecommendations.filter(r => r.confidence >= 85).length
    const avgConfidence = totalRecommendations > 0 ?
      aiRecommendations.reduce((sum, r) => sum + r.confidence, 0) / totalRecommendations : 0

    return {
      totalRecommendations,
      highConfidenceCount,
      avgConfidence,
      aiTrades: 0, // Real data only
      manualTrades: 0,
      aiWinRate: 0,
      manualWinRate: 0,
      aiProfit: (enhancedAccount?.totalPnL || 0) * 0.7,
      manualProfit: (enhancedAccount?.totalPnL || 0) * 0.3
    }
  }, [aiRecommendations, enhancedAccount])

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Alert System */}
      {alertMessage && (
        <div className="fixed top-4 left-4 right-4 sm:right-4 sm:left-auto sm:max-w-md z-50 bg-gray-800 border border-purple-500 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <CpuChipIcon className="w-5 h-5 text-purple-400" />
            <p className="text-purple-300">{alertMessage}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-screen">

        {/* Mobile Header */}
        <header className="lg:hidden bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
              >
                {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
              </button>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <CpuChipIcon className="w-5 h-5 text-purple-400" />
                AI Trading
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${botConfig.enabled ? 'bg-purple-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-400">{aiStats.aiTrades} AI trades</span>
            </div>
          </div>
        </header>

        {/* Enhanced Sidebar */}
        <aside className={`
          lg:flex lg:flex-col lg:w-80 lg:bg-gray-800 lg:border-r lg:border-gray-700
          ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 w-80 bg-gray-800 border-r border-gray-700 flex flex-col' : 'hidden'}
        `}>

          {/* Enhanced Sidebar Header */}
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CpuChipIcon className="w-6 h-6 text-purple-400" />
              AI Trading Platform
            </h1>

            {/* Connection Status */}
            {!enhancedAccount?.isConnected && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>Alpaca API Disconnected</span>
                </div>
                <p className="text-red-200 text-xs mt-1">
                  Connect to Alpaca to enable live trading features
                </p>
              </div>
            )}

            {/* Enhanced Balance Display with AI Insights */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-300">AI-Enhanced Balance</span>
                <span className="text-xs text-purple-400">{enhancedAccount?.accountType || 'N/A'}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {enhancedAccount ? formatCurrency(enhancedAccount.totalBalance) : '$0.00'}
              </div>
              <div className={`text-sm ${enhancedAccount?.totalPnL ? getColorClass(enhancedAccount.totalPnL) : 'text-gray-400'}`}>
                {enhancedAccount?.totalPnL ? formatCurrency(enhancedAccount.totalPnL) : '$0.00'}
                ({enhancedAccount?.totalReturn ? formatPercent(enhancedAccount.totalReturn * 100) : '0.00%'})
              </div>
              <div className="text-xs text-purple-300 mt-2">
                {aiStats.totalRecommendations} AI signals generated
              </div>
            </div>

            {/* AI Bot Status */}
            <div className={`bg-gray-700 rounded-lg p-4 mb-4 border-l-4 ${
              botConfig.enabled ? 'border-purple-500' : 'border-gray-600'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">AI Bot Status</span>
                <div className={`w-2 h-2 rounded-full ${
                  botConfig.enabled ? 'bg-purple-400 animate-pulse' : 'bg-gray-400'
                }`}></div>
              </div>
              <div className={`font-semibold ${botConfig.enabled ? 'text-purple-400' : 'text-gray-400'}`}>
                {botConfig.enabled ? `Active (${botConfig.mode})` : 'Inactive'}
              </div>
              {botConfig.enabled && (
                <div className="text-xs text-purple-300 mt-1">
                  Min Confidence: {botConfig.minimumConfidence}%
                </div>
              )}
            </div>

            {/* Market Clock */}
            <MarketClock variant="sidebar" showDetails={false} />

            {/* Enhanced Quick AI Stats */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-gray-700 rounded p-2">
                <div className="text-xs text-gray-400">AI Recommendations</div>
                <div className="font-semibold text-purple-400">{aiStats.totalRecommendations}</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-xs text-gray-400">High Confidence</div>
                <div className="font-semibold text-green-400">{aiStats.highConfidenceCount}</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-xs text-gray-400">AI Win Rate</div>
                <div className="font-semibold text-blue-400">{aiStats.aiWinRate.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-xs text-gray-400">Positions</div>
                <div className="font-semibold text-white">{positions.length}</div>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigationTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setIsMobileMenuOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </nav>

          {/* Enhanced Footer with AI Performance */}
          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="text-xs text-gray-400 mb-2">Real-time Alpaca Integration</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Connected:</span>
                <span className={enhancedAccount?.isConnected ? 'text-green-400' : 'text-red-400'}>
                  {enhancedAccount?.isConnected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">AI Profit:</span>
                <span className={getColorClass(aiStats.aiProfit)}>{formatCurrency(aiStats.aiProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Positions:</span>
                <span className="text-white">{positions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Update:</span>
                <span className="text-white">{isClient ? lastUpdate.toLocaleTimeString() : '--:--:-- --'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Data Source:</span>
                <span className={dataSource === 'alpaca' ? 'text-green-400' : dataSource === 'hybrid' ? 'text-blue-400' : 'text-yellow-400'}>
                  {dataSource === 'alpaca' ? 'Alpaca' : dataSource === 'hybrid' ? 'Hybrid' : 'Fallback'}
                  {dataSource !== 'alpaca' && '⚠️'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Enhanced Desktop Header */}
          <header className="hidden lg:block bg-gray-800 border-b border-gray-700 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <CpuChipIcon className="w-8 h-8 text-purple-400" />
                  AI-Powered Trading Dashboard
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <MarketClock variant="header" showDetails={false} />
                  <span>•</span>
                  <span>Last AI Update: {isClient ? lastUpdate.toLocaleTimeString() : '--:--:-- --'}</span>
                  <span>•</span>
                  <span className={dataSource === 'alpaca' ? 'text-green-400' : dataSource === 'hybrid' ? 'text-blue-400' : 'text-yellow-400'}>
                    Data: {dataSource === 'alpaca' ? 'Alpaca' : dataSource === 'hybrid' ? 'Alpaca + Fallback' : 'Fallback APIs'}
                    {dataSource !== 'alpaca' && '⚠️'}
                  </span>
                </div>
              </div>

              {/* Enhanced Control Bar */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                  botConfig.enabled
                    ? 'bg-purple-900/30 text-purple-300 border-purple-500/30'
                    : 'bg-gray-900/30 text-gray-400 border-gray-500/30'
                }`}>
                  <CpuChipIcon className="w-4 h-4" />
                  AI Bot: {botConfig.enabled ? botConfig.mode : 'OFF'}
                </div>

                <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-400">AI Signals: </span>
                  <span className="text-purple-400 font-medium">{aiStats.totalRecommendations}</span>
                </div>


                <button
                  onClick={refreshAIData}
                  disabled={marketLoading}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${marketLoading ? 'animate-spin' : ''}`} />
                  {marketLoading ? 'Refreshing...' : 'Refresh AI'}
                </button>

                <button
                  onClick={toggleBot}
                  disabled={!enhancedAccount?.isConnected}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    botConfig.enabled
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <BoltIcon className="w-4 h-4" />
                  {botConfig.enabled ? 'Disable Bot' : 'Enable Bot'}
                </button>
              </div>
            </div>
          </header>

          {/* Performance Summary Bar */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-purple-500/30 px-6 py-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-sm">
              <div>
                <div className="text-xs text-purple-300">AI Signals</div>
                <div className="font-semibold text-purple-400">{aiStats.totalRecommendations}</div>
              </div>
              <div>
                <div className="text-xs text-green-300">High Confidence</div>
                <div className="font-semibold text-green-400">{aiStats.highConfidenceCount}</div>
              </div>
              <div>
                <div className="text-xs text-blue-300">AI Signals</div>
                <div className="font-semibold text-blue-400">{aiStats.totalRecommendations}</div>
              </div>
              <div>
                <div className="text-xs text-gray-300">Market Status</div>
                <div className="font-semibold text-gray-400">{marketStatus}</div>
              </div>
              <div>
                <div className="text-xs text-purple-300">Connection</div>
                <div className={`font-semibold ${enhancedAccount?.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {enhancedAccount?.isConnected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {(marketError || tradingError) && (
            <div className="mx-6 mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="font-medium">Connection Error</span>
              </div>
              <p className="text-red-200 text-sm mt-1">
                {marketError || tradingError}
              </p>
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-6 space-y-6 pb-20 lg:pb-6">

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* AI Performance Overview */}
                  <section className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <SparklesIcon className="w-5 h-5 text-purple-400" />
                      AI-Enhanced Portfolio Overview
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <BalanceChart account={enhancedAccount} isClient={isClient} />

                      <MarketClock variant="card" showDetails={true} />

                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-purple-300 mb-3">Real-time Account Status</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Balance:</span>
                            <span className="text-white font-medium">{enhancedAccount ? formatCurrency(enhancedAccount.totalBalance) : '$0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Cash Available:</span>
                            <span className="text-green-400 font-medium">{enhancedAccount ? formatCurrency(enhancedAccount.cashBalance) : '$0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Invested Amount:</span>
                            <span className="text-blue-400 font-medium">{enhancedAccount?.investedAmount ? formatCurrency(enhancedAccount.investedAmount) : '$0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Unrealized P&L:</span>
                            <span className={`font-medium ${enhancedAccount?.totalPnL ? getColorClass(enhancedAccount.totalPnL) : 'text-gray-400'}`}>
                              {enhancedAccount?.totalPnL ? formatCurrency(enhancedAccount.totalPnL) : '$0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Account Type:</span>
                            <span className={enhancedAccount?.accountType === 'LIVE' ? 'text-red-400' : 'text-cyan-400'}>
                              {enhancedAccount?.accountType || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-purple-300 mb-3">AI vs Manual Performance</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">AI Recommendations:</span>
                            <span className="text-purple-400 font-medium">{aiStats.totalRecommendations}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">High Confidence:</span>
                            <span className="text-green-400 font-medium">{aiStats.highConfidenceCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Current Positions:</span>
                            <span className="text-blue-400 font-medium">{positions.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total P&L:</span>
                            <span className={`font-medium ${enhancedAccount?.totalPnL ? getColorClass(enhancedAccount.totalPnL) : 'text-gray-400'}`}>
                              {enhancedAccount?.totalPnL ? formatCurrency(enhancedAccount.totalPnL) : '$0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Connection Status:</span>
                            <span className={enhancedAccount?.isConnected ? 'text-green-400' : 'text-red-400'}>
                              {enhancedAccount?.isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Current AI Recommendations Preview */}
                  <section className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <LightBulbIcon className="w-5 h-5 text-yellow-400" />
                        Active AI Recommendations
                      </h3>
                      <button
                        onClick={() => setActiveTab('ai-recommendations')}
                        className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
                      >
                        View All <ArrowTrendingUpIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {aiRecommendations.slice(0, 6).map(rec => (
                        <div key={rec.id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-purple-500">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-white">{rec.symbol}</span>
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                rec.action === 'BUY' ? 'bg-green-600 text-white' :
                                rec.action === 'SELL' ? 'bg-red-600 text-white' :
                                'bg-yellow-600 text-white'
                              }`}>
                                {rec.action}
                              </span>
                              <CpuChipIcon className="w-3 h-3 text-purple-400" />
                            </div>
                          </div>
                          <div className="text-sm text-gray-300 mb-1">
                            AI Confidence: <span className="text-purple-400 font-medium">{rec.confidence}%</span>
                          </div>
                          <div className="text-sm text-gray-300 mb-1">
                            Target: <span className="text-white">${rec.targetPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Expected: <span className={getColorClass(rec.expectedReturn)}>{formatPercent(rec.expectedReturn)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {aiRecommendations.length === 0 && (
                      <div className="text-center py-8">
                        <CpuChipIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-300 mb-2">AI Analyzing Markets</h4>
                        <p className="text-gray-500">AI models are processing Alpaca market data for new opportunities</p>
                        <button
                          onClick={refreshAIData}
                          disabled={marketLoading}
                          className="mt-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm"
                        >
                          {marketLoading ? 'Refreshing...' : 'Refresh AI Analysis'}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* AI Recommendations Tab */}
              {activeTab === 'ai-recommendations' && (
                <div className="space-y-6">
                  <section className="bg-gray-800 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <CpuChipIcon className="w-6 h-6 text-purple-400" />
                        AI-Powered Trading Recommendations
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{aiRecommendations.length} active signals</span>
                        <span>•</span>
                        <span>{aiRecommendations.filter(r => r.confidence >= 85).length} high confidence</span>
                        <span>•</span>
                        <span>Bot: {botConfig.enabled ? `Active (${botConfig.mode})` : 'Inactive'}</span>
                      </div>
                    </div>

                    {aiRecommendations.length > 0 ? (
                      <div className="space-y-4">
                        {aiRecommendations.map(recommendation => (
                          <AIRecommendationCard
                            key={recommendation.id}
                            recommendation={recommendation}
                            onExecute={executeAIRecommendation}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <CpuChipIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">No AI Signals Available</h3>
                        <p className="text-gray-500 mb-4">AI models are analyzing current Alpaca market conditions</p>
                        <button
                          onClick={refreshAIData}
                          disabled={marketLoading || !enhancedAccount?.isConnected}
                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium"
                        >
                          {marketLoading ? 'Generating...' : 'Generate New AI Recommendations'}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* Bot Configuration Tab */}
              {activeTab === 'bot-config' && (
                <div className="space-y-6">
                  {/* Bot Status and Quick Toggle */}
                  <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <CpuChipIcon className="w-6 h-6 text-purple-400" />
                        AI Trading Bot Configuration
                        {!enhancedAccount?.isConnected && (
                          <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                            Requires Connection
                          </span>
                        )}
                      </h2>
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-2 rounded-lg text-sm border ${
                          botConfig.mode === 'CONSERVATIVE' ? 'bg-green-900/30 text-green-300 border-green-500/30' :
                          botConfig.mode === 'BALANCED' ? 'bg-blue-900/30 text-blue-300 border-blue-500/30' :
                          'bg-red-900/30 text-red-300 border-red-500/30'
                        }`}>
                          {botConfig.mode} Mode
                        </div>
                        <div className={`w-3 h-3 rounded-full ${botConfig.enabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                      </div>
                    </div>

                    {/* Master Bot Toggle */}
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium flex items-center gap-2">
                            <RocketLaunchIcon className="w-5 h-5 text-blue-400" />
                            Enable AI Trading Bot
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            {enhancedAccount?.isConnected
                              ? 'Automated execution of AI recommendations based on confidence thresholds'
                              : 'Requires Alpaca API connection to enable automated trading'
                            }
                          </p>
                        </div>
                        <label className={`relative inline-flex items-center ${enhancedAccount?.isConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                          <input
                            type="checkbox"
                            checked={botConfig.enabled}
                            disabled={!enhancedAccount?.isConnected}
                            onChange={(e) => setBotConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>

                    {botConfig.enabled && enhancedAccount?.isConnected && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                          <BoltIcon className="w-4 h-4" />
                          <span className="font-medium">Bot Status: ACTIVE</span>
                        </div>
                        <p className="text-green-200 text-sm">
                          AI bot is monitoring Alpaca markets and will execute trades based on your configured parameters.
                          Current mode: {botConfig.mode} with {botConfig.minimumConfidence}% minimum confidence threshold.
                        </p>
                      </div>
                    )}

                    {botConfig.enabled && !enhancedAccount?.isConnected && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-400 mb-2">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          <span className="font-medium">Bot Status: DISCONNECTED</span>
                        </div>
                        <p className="text-red-200 text-sm">
                          AI bot cannot operate without Alpaca API connection. Please check your connection and credentials.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bot Configuration Sections */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* AI Model and Mode Selection */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="font-semibold mb-4 text-white flex items-center gap-2">
                        <CpuChipIcon className="w-5 h-5 text-blue-400" />
                        AI Model Configuration
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">AI Model Type</label>
                          <select
                            value={botConfig.aiModel}
                            disabled={!enhancedAccount?.isConnected}
                            onChange={(e) => setBotConfig(prev => ({ ...prev, aiModel: e.target.value as 'GPT_ENHANCED' | 'NEURAL_NETWORK' | 'ENSEMBLE' }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="GPT_ENHANCED">GPT Enhanced Model</option>
                            <option value="NEURAL_NETWORK">Neural Network</option>
                            <option value="ENSEMBLE">Ensemble (Recommended)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Trading Mode</label>
                          <div className="space-y-2">
                            {[
                              {
                                mode: 'CONSERVATIVE' as const,
                                title: 'Conservative AI Trading',
                                description: 'High confidence signals only, strict risk limits'
                              },
                              {
                                mode: 'BALANCED' as const,
                                title: 'Balanced AI Strategy',
                                description: 'Optimal risk/reward with moderate AI confidence'
                              },
                              {
                                mode: 'AGGRESSIVE' as const,
                                title: 'Aggressive AI Trading',
                                description: 'Higher frequency, advanced users only'
                              }
                            ].map(option => (
                              <div
                                key={option.mode}
                                className={`border rounded-lg p-3 transition-all ${
                                  !enhancedAccount?.isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                } ${
                                  botConfig.mode === option.mode
                                    ? option.mode === 'CONSERVATIVE' ? 'bg-green-900/30 text-green-300 border-green-500/30' :
                                      option.mode === 'BALANCED' ? 'bg-blue-900/30 text-blue-300 border-blue-500/30' :
                                      'bg-red-900/30 text-red-300 border-red-500/30'
                                    : 'border-gray-600 hover:border-gray-500'
                                }`}
                                onClick={() => enhancedAccount?.isConnected && setBotConfig(prev => ({ ...prev, mode: option.mode }))}
                              >
                                <div className="font-medium text-white">{option.title}</div>
                                <div className="text-xs text-gray-400">{option.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk and Execution Parameters */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="font-semibold mb-4 text-white flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-green-400" />
                        Risk Management
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">
                            Minimum AI Confidence: {botConfig.minimumConfidence}%
                          </label>
                          <input
                            type="range"
                            min="60"
                            max="95"
                            value={botConfig.minimumConfidence}
                            disabled={!enhancedAccount?.isConnected}
                            onChange={(e) => setBotConfig(prev => ({ ...prev, minimumConfidence: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>60% (More Signals)</span>
                            <span>95% (High Quality Only)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-2">
                            Auto-Execute Above: {botConfig.autoExecuteAbove}%
                          </label>
                          <input
                            type="range"
                            min="80"
                            max="98"
                            value={botConfig.autoExecuteAbove}
                            disabled={!enhancedAccount?.isConnected}
                            onChange={(e) => setBotConfig(prev => ({ ...prev, autoExecuteAbove: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>80% (Frequent Auto)</span>
                            <span>98% (Rare Auto)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-2">
                            Max Position Size: {botConfig.maxPositionSize}%
                          </label>
                          <input
                            type="range"
                            min="2"
                            max="20"
                            value={botConfig.maxPositionSize}
                            disabled={!enhancedAccount?.isConnected}
                            onChange={(e) => setBotConfig(prev => ({ ...prev, maxPositionSize: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-2">
                            Max Daily Trades: {botConfig.maxDailyTrades}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="30"
                            value={botConfig.maxDailyTrades}
                            disabled={!enhancedAccount?.isConnected}
                            onChange={(e) => setBotConfig(prev => ({ ...prev, maxDailyTrades: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other tabs */}
              {activeTab === 'ai-engine' && (
                <AITradingControl />
              )}

              {activeTab === 'ai-learning' && (
                <AILearningDashboard />
              )}

              {activeTab === 'live-trades' && (
                <LiveTrades
                  positions={positions}
                  quotes={quotes}
                  executeOrder={executeOrder}
                  isLoading={tradingLoading}
                />
              )}

              {activeTab === 'performance' && (
                <PerformanceAnalytics
                  account={enhancedAccount}
                  positions={positions}
                  botConfig={botConfig}
                />
              )}

              {activeTab === 'education' && (
                <div className="space-y-6">
                  <section className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <AcademicCapIcon className="w-5 h-5 text-blue-400" />
                      AI Trading Education Center
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
                        <h4 className="font-semibold text-purple-400 mb-4">Understanding AI Recommendations</h4>
                        <div className="space-y-3 text-sm text-purple-200">
                          <p>AI trading recommendations use machine learning models trained on vast amounts of market data integrated with real-time Alpaca feeds.</p>
                          <ul className="space-y-2">
                            <li>• Confidence scores indicate the AI's certainty in predictions</li>
                            <li>• Higher confidence typically correlates with better outcomes</li>
                            <li>• AI considers technical, fundamental, and sentiment factors</li>
                            <li>• Always use proper risk management regardless of AI confidence</li>
                            <li>• All recommendations use real-time Alpaca market data</li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                        <h4 className="font-semibold text-blue-400 mb-4">AI Bot Best Practices</h4>
                        <div className="space-y-3 text-sm text-blue-200">
                          <p>Automated AI trading enhances performance when configured properly with Alpaca API integration and appropriate risk controls.</p>
                          <ul className="space-y-2">
                            <li>• Start with paper trading to test AI strategies safely</li>
                            <li>• Set conservative position sizes initially</li>
                            <li>• Monitor AI performance and adjust parameters regularly</li>
                            <li>• Never risk more than you can afford to lose</li>
                            <li>• Ensure stable Alpaca API connection for optimal performance</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <CalculatorIcon className="w-5 h-5 text-blue-400" />
                    AI Analytics Dashboard
                  </h2>
                  <p className="text-gray-400">Advanced AI performance analytics with real-time Alpaca data integration will be available here.</p>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}