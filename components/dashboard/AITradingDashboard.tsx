'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useMarketData } from '@/hooks/useMarketData'
import { useAlpacaTrading } from '@/hooks/useAlpacaTrading'
import { useAIBotAutoExecution, getBotConfig } from '@/hooks/useEnhancedAITrading'
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
import AIBotActivityMonitor from './AIBotActivityMonitor'
import { MarketClock } from './MarketClock'
import { BotIcon } from 'lucide-react'

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
    if (confidence >= 65) return 'text-purple-400'
    return 'text-yellow-400'
  }

  const getConfidenceBgGlow = (confidence: number): string => {
    if (confidence >= 85) return 'shadow-green-400/20 border-green-400/30'
    if (confidence >= 75) return 'shadow-blue-400/20 border-blue-400/30'
    if (confidence >= 65) return 'shadow-purple-400/20 border-purple-400/30'
    return 'shadow-yellow-400/20 border-yellow-400/30'
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'HIGH': return 'bg-red-600/80 text-white border-red-400/50 shadow-red-400/30'
      case 'MEDIUM': return 'bg-yellow-600/80 text-white border-yellow-400/50 shadow-yellow-400/30'
      case 'LOW': return 'bg-green-600/80 text-white border-green-400/50 shadow-green-400/30'
      default: return 'bg-gray-600/80 text-white border-gray-400/50'
    }
  }

  const isHighConfidence = recommendation.confidence >= 85
  const isCrypto = recommendation.symbol.includes('USD')

  return (
    <div className={`ai-recommendation-card border rounded-xl p-6 transition-all duration-300 hover:shadow-xl backdrop-blur-sm ${
      recommendation.action === 'BUY'
        ? 'border-green-500/30 bg-gradient-to-br from-green-900/20 to-green-800/10 hover:from-green-900/30 hover:to-green-800/20'
        : recommendation.action === 'SELL'
        ? 'border-red-500/30 bg-gradient-to-br from-red-900/20 to-red-800/10 hover:from-red-900/30 hover:to-red-800/20'
        : 'border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 hover:from-yellow-900/30 hover:to-yellow-800/20'
    } ${getConfidenceBgGlow(recommendation.confidence)} ${isHighConfidence ? 'animate-pulse-glow' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {/* Action Badge with Enhanced Styling */}
            <div className={`relative px-4 py-2 rounded-lg font-bold text-sm shadow-lg border backdrop-blur-sm ${
              recommendation.action === 'BUY'
                ? 'bg-green-600/90 text-white border-green-400/50 shadow-green-400/30'
                : recommendation.action === 'SELL'
                ? 'bg-red-600/90 text-white border-red-400/50 shadow-red-400/30'
                : 'bg-yellow-600/90 text-white border-yellow-400/50 shadow-yellow-400/30'
            }`}>
              {recommendation.action === 'BUY' ? '🔥 BUY' : recommendation.action === 'SELL' ? '📉 SELL' : '⏸️ HOLD'}
              {isHighConfidence && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse border border-gray-800"></div>
              )}
            </div>

            {/* Symbol with Asset Type Indicator */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-2xl tracking-wider">{recommendation.symbol}</span>
              {isCrypto && (
                <div className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-bold border border-orange-400/30">
                  ₿ CRYPTO
                </div>
              )}
            </div>

            {/* Priority Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-lg ${getPriorityColor(recommendation.priority)}`}>
              {recommendation.priority === 'HIGH' ? '🔴 HIGH' : recommendation.priority === 'MEDIUM' ? '🟡 MEDIUM' : '🟢 LOW'} PRIORITY
            </span>

            {/* Safety Check Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-lg ${
              recommendation.safetyChecks.passedRiskCheck
                ? 'bg-green-600/80 text-white border-green-400/50 shadow-green-400/30'
                : 'bg-red-600/80 text-white border-red-400/50 shadow-red-400/30'
            }`}>
              {recommendation.safetyChecks.passedRiskCheck ? '✅ VERIFIED' : '⚠️ RISKY'}
            </span>

            {/* AI Enhancement Badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold border border-indigo-400/30">
              <CpuChipIcon className="w-4 h-4 animate-pulse" />
              <span>AI POWERED</span>
            </div>
          </div>

          {/* Enhanced Data Grid - Mobile Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-gradient-to-br from-gray-700/60 to-gray-800/40 rounded-lg p-4 border border-gray-600/50 hover:border-blue-400/50 transition-all">
              <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                💰 Current Price
              </div>
              <div className="font-bold text-white text-lg font-mono">${recommendation.currentPrice.toFixed(2)}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-700/60 to-blue-800/40 rounded-lg p-4 border border-blue-600/50 hover:border-blue-400/70 transition-all">
              <div className="text-xs text-blue-300 mb-2 flex items-center gap-1">
                🎯 AI Target
              </div>
              <div className="font-bold text-white text-lg font-mono">${recommendation.targetPrice.toFixed(2)}</div>
              <div className="text-xs text-blue-200">
                {((recommendation.targetPrice - recommendation.currentPrice) / recommendation.currentPrice * 100).toFixed(1)}% potential
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-700/60 to-red-800/40 rounded-lg p-4 border border-red-600/50 hover:border-red-400/70 transition-all">
              <div className="text-xs text-red-300 mb-2 flex items-center gap-1">
                🛡️ Stop Loss
              </div>
              <div className="font-bold text-red-400 text-lg font-mono">${recommendation.stopLoss.toFixed(2)}</div>
              <div className="text-xs text-red-200">
                {((recommendation.currentPrice - recommendation.stopLoss) / recommendation.currentPrice * 100).toFixed(1)}% protection
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-700/60 to-green-800/40 rounded-lg p-4 border border-green-600/50 hover:border-green-400/70 transition-all">
              <div className="text-xs text-green-300 mb-2 flex items-center gap-1">
                💵 Max Safe Amount
              </div>
              <div className="font-bold text-green-400 text-lg font-mono">${recommendation.maxSafeAmount.toLocaleString()}</div>
              <div className="text-xs text-green-200">
                {Math.floor(recommendation.maxSafeAmount / recommendation.currentPrice)} shares
              </div>
            </div>

            <div className={`bg-gradient-to-br rounded-lg p-4 border transition-all ${
              isHighConfidence
                ? 'from-green-700/60 to-emerald-800/40 border-green-500/50 hover:border-green-400/70 animate-pulse-glow'
                : recommendation.confidence >= 75
                ? 'from-blue-700/60 to-blue-800/40 border-blue-600/50 hover:border-blue-400/70'
                : 'from-yellow-700/60 to-yellow-800/40 border-yellow-600/50 hover:border-yellow-400/70'
            }`}>
              <div className="text-xs text-gray-300 mb-2 flex items-center gap-1">
                🤖 AI Confidence
                {isHighConfidence && <span className="animate-bounce">⭐</span>}
              </div>
              <div className={`font-bold text-xl font-mono ${getConfidenceColor(recommendation.confidence)}`}>
                {recommendation.confidence}%
              </div>
              <div className="text-xs text-gray-300">
                {recommendation.confidence >= 85 ? 'Very High' : recommendation.confidence >= 75 ? 'High' : recommendation.confidence >= 65 ? 'Moderate' : 'Low'} Certainty
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">AI Analysis & Reasoning</div>
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">{recommendation.reasoning}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded p-3">
                <div className="text-xs text-indigo-400 mb-1">AI Insights</div>
                <div className="text-xs text-indigo-200 space-y-1">
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
          <div className="text-xs text-center text-indigo-400">
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

  const [botConfig, setBotConfig] = useState<BotConfig>(() => {
    // Initialize bot config from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const savedConfig = localStorage.getItem('ai-bot-config')
        if (savedConfig) {
          return JSON.parse(savedConfig)
        }
      } catch (e) {
        console.error('Failed to parse saved bot config:', e)
      }
    }

    return {
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
      watchlistSymbols: [
        // Major Tech Giants
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
        // Popular ETFs & Market Indicators
        'SPY', 'QQQ', 'IWM', 'VTI', 'DIA',
        // Crypto Assets (Alpaca supported)
        'BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'AVAXUSD',
        // Growth & AI Stocks
        'AMD', 'NFLX', 'ORCL', 'CRM', 'ADBE', 'PYPL',
        // Financial & Energy
        'JPM', 'BAC', 'WFC', 'XLE', 'XLF', 'GLD',
        // Emerging & High-Volume Stocks
        'PLTR', 'NIO', 'RIVN', 'COIN', 'HOOD', 'AMC', 'GME'
      ],
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
    }
  })

  // Real Alpaca API data hooks
  const { quotes, marketStatus, isLoading: marketLoading, error: marketError, dataSource, refreshData } = useMarketData(botConfig.watchlistSymbols)
  const { account, positions, isLoading: tradingLoading, error: tradingError, fetchAccount, fetchPositions, executeOrder } = useAlpacaTrading()

  // Auto-execution monitoring hook
  const autoExecution = useAIBotAutoExecution()

  // Bot state persistence effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ai-bot-config', JSON.stringify(botConfig))
      } catch (e) {
        console.error('Failed to save bot config:', e)
      }
    }
  }, [botConfig])

  // Check AI bot status on load and restore state
  useEffect(() => {
    const checkBotStatus = async () => {
      try {
        const response = await fetch('/api/ai-trading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status' })
        })
        const statusData = await response.json()

        if (statusData.running) {
          setBotConfig(prev => ({ ...prev, enabled: true }))
          setAlertMessage('AI Trading Bot was already running - state restored')
          setTimeout(() => setAlertMessage(null), 3000)
        }
      } catch (error) {
        console.error('Failed to check bot status:', error)
      }
    }

    checkBotStatus()
  }, [])

  // Enhanced account with calculated fields and persistence
  const enhancedAccount: EnhancedAccount | null = useMemo(() => {
    if (!account) {
      // Try to load from localStorage if account data isn't available yet
      const savedData = typeof window !== 'undefined' ? localStorage.getItem('ai-trading-portfolio') : null
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          // Only use saved data if it's recent (less than 5 minutes old)
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            return parsed.account
          }
        } catch (e) {
          console.error('Failed to parse saved portfolio data:', e)
        }
      }
      return null
    }

    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
    const totalReturn = account.totalBalance > 0 ? totalPnL / account.totalBalance : 0
    const investedAmount = positions.reduce((sum, pos) => sum + pos.marketValue, 0)

    const enhanced = {
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

    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ai-trading-portfolio', JSON.stringify({
          account: enhanced,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.error('Failed to save portfolio data:', e)
      }
    }

    return enhanced
  }, [account, positions])

  // Generate AI recommendations based on real market data
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])

  // Auto-refresh portfolio data every 30 seconds for dynamic updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (fetchAccount && fetchPositions) {
        fetchAccount()
        fetchPositions()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [fetchAccount, fetchPositions])

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
          // ✅ FIXED: Align thresholds for automatic execution
          minConfidenceThreshold: Math.max(0.55, (botConfig.minimumConfidence - 5) / 100),
          autoExecution: {
            autoExecuteEnabled: true,
            confidenceThresholds: {
              minimum: Math.max(0.55, (botConfig.minimumConfidence - 10) / 100), // 10% buffer below user setting
              conservative: Math.max(0.60, botConfig.minimumConfidence / 100),
              aggressive: Math.min(0.85, (botConfig.minimumConfidence + 5) / 100),
              maximum: 0.90
            },
            positionSizing: {
              baseSize: Math.max(0.02, botConfig.riskLevel * 0.01), // 2-5% based on risk level
              maxSize: Math.min(0.10, botConfig.riskLevel * 0.02), // 4-10% based on risk level
              confidenceMultiplier: 2.0
            },
            riskControls: {
              maxDailyTrades: Math.min(50, botConfig.maxDailyTrades || 25),
              maxOpenPositions: Math.min(15, botConfig.maxPositions || 10),
              maxDailyLoss: 0.03, // 3% max daily loss
              cooldownPeriod: Math.max(2, botConfig.cooldownMinutes || 5)
            },
            executionRules: {
              marketHoursOnly: false, // Allow 24/7 for crypto
              avoidEarnings: botConfig.avoidEarnings || false,
              volumeThreshold: 10000, // Lower volume threshold
              spreadThreshold: 0.05, // 5% spread tolerance
              cryptoTradingEnabled: true,
              afterHoursTrading: true,
              weekendTrading: true
            }
          }
        }
      }),
      }, )

      clearTimeout(timeoutId) // Clear timeout if request completes
      const result = await response.json()

      if (response.ok) {
        const updatedConfig = { ...botConfig, enabled: newStatus }
        setBotConfig(updatedConfig)

        // Immediately save to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('ai-bot-config', JSON.stringify(updatedConfig))
          } catch (e) {
            console.error('Failed to save bot config:', e)
          }
        }

        setAlertMessage(`✅ AI Trading Bot ${newStatus ? 'started' : 'stopped'} successfully! ${newStatus ? 'Automatic order execution is now ACTIVE.' : ''}`)

        if (newStatus) {
          // Force refresh portfolio data when bot starts
          if (fetchAccount && fetchPositions) {
            fetchAccount()
            fetchPositions()
          }
        }
      } else {
        throw new Error(result.details || result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to toggle AI Trading Bot:', error)

      let errorMessage = error.message
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - AI Trading Bot startup took too long. Please try again.'
      }

      setAlertMessage(`❌ Failed to ${botConfig.enabled ? 'stop' : 'start'} AI Trading Bot: ${errorMessage}`)
    }

    setTimeout(() => setAlertMessage(null), 8000) // Longer timeout for better visibility
  }, [botConfig, fetchAccount, fetchPositions])

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

  // Navigation tabs - Portfolio Overview as main Wall Street inspired spotlight
  const navigationTabs = [
    { id: 'overview', name: 'Portfolio Overview', icon: ChartBarIcon },
    { id: 'ai-engine', name: 'AI Live Trading', icon: RocketLaunchIcon },
    { id: 'ai-recommendations', name: 'AI Recommendations', icon: SparklesIcon },
    { id: 'live-trades', name: 'Active Positions', icon: BoltIcon },
    { id: 'performance', name: 'Performance', icon: CalculatorIcon },
    { id: 'bot-config', name: 'Bot Settings', icon: CpuChipIcon },
    { id: 'ai-learning', name: 'AI Learning', icon: AcademicCapIcon }
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
        <div className="fixed top-4 left-4 right-4 sm:right-4 sm:left-auto sm:max-w-md z-50 bg-gray-800 border border-indigo-500 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <CpuChipIcon className="w-5 h-5 text-indigo-400" />
            <p className="text-indigo-300">{alertMessage}</p>
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
                <CpuChipIcon className="w-5 h-5 text-indigo-400" />
                AI Trading
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isClient && botConfig.enabled ? 'bg-indigo-400 animate-pulse' : 'bg-gray-400'}`}></div>
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
              <CpuChipIcon className="w-6 h-6 text-indigo-400" />
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
            <div className="bg-gradient-to-r from-indigo-900/30 to-blue-900/30 border border-indigo-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-200">Total Balance</span>
                <span className="text-xs text-indigo-400">{enhancedAccount?.accountType || 'N/A'}</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {enhancedAccount ? formatCurrency(enhancedAccount.totalBalance) : '$0.00'}
              </div>
              <div className={`text-sm ${enhancedAccount?.totalPnL ? getColorClass(enhancedAccount.totalPnL) : 'text-gray-400'}`}>
                {enhancedAccount?.totalPnL ? formatCurrency(enhancedAccount.totalPnL) : '$0.00'}
                ({enhancedAccount?.totalReturn ? formatPercent(enhancedAccount.totalReturn * 100) : '0.00%'})
              </div>
              {/* <div className="text-xs text-indigo-300 mt-2">
                {aiStats.totalRecommendations} AI signals generated
              </div> */}
            </div>

            {/* AI Bot Status - Compact */}
            {/* <div className={`bg-gray-700/50 rounded-lg p-3 mb-4 border ${
              isClient && botConfig.enabled ? 'border-indigo-500/50' : 'border-gray-600/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isClient && botConfig.enabled ? 'bg-indigo-400 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-xs text-gray-300">AI Bot</span>
                </div>
                <div className={`text-xs font-semibold ${isClient && botConfig.enabled ? 'text-indigo-400' : 'text-gray-400'}`}>
                  {isClient && botConfig.enabled ? botConfig.mode : 'OFF'}
                </div>
              </div>
            </div> */}

            {/* Market Clock */}
            <MarketClock variant="sidebar" showDetails={true} />

            {/* Live AI Signals Summary */}
            {/* <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-purple-300 flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  AI Signals
                </span>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Active:</span>
                  <span className="text-purple-400 font-semibold text-xs">{aiStats.totalRecommendations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">High Confidence:</span>
                  <span className="text-green-400 font-semibold text-xs">{aiStats.highConfidenceCount}</span>
                </div>
                {aiRecommendations.length > 0 && (
                  <div className="pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Top Signal:</div>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium text-xs">{aiRecommendations[0].symbol}</span>
                      <span className={`text-xs font-bold ${
                        aiRecommendations[0].action === 'BUY' ? 'text-green-400' :
                        aiRecommendations[0].action === 'SELL' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {aiRecommendations[0].action} {aiRecommendations[0].confidence}%
                      </span>
                    </div>
                  </div>
                )}
              </div> 
            </div> */}
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
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </nav>

          {/* Compact Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Connection:</span>
                <span className={enhancedAccount?.isConnected ? 'text-green-400' : 'text-red-400'}>
                  {enhancedAccount?.isConnected ? '🟢' : '🔴'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Positions:</span>
                <span className="text-white">{positions.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Source:</span>
                <span className={dataSource === 'alpaca' ? 'text-green-400' : 'text-yellow-400'}>
                  {dataSource === 'alpaca' ? 'Live' : 'Demo'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Enhanced Desktop Header */}
          <header className="hidden lg:block bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                {/* High-Confidence AI Alert */}
                {aiStats.highConfidenceCount > 0 && (
                  <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg px-4 py-2 flex items-center gap-3">
                    <SparklesIcon className="w-5 h-5 text-green-400 animate-pulse" />
                    <div>
                      <div className="text-sm font-medium text-green-300">
                        {aiStats.highConfidenceCount} High-Confidence Signal{aiStats.highConfidenceCount > 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-green-400">
                        {aiRecommendations[0]?.symbol} {aiRecommendations[0]?.action} @ {aiRecommendations[0]?.confidence.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Compact Status Bar */}
                {/* <div className="flex items-center gap-3 text-sm text-gray-400">
                  <MarketClock variant="header" showDetails={false} />
                  <span className="text-purple-400">{aiStats.totalRecommendations} Signals</span>
                  <span className={dataSource === 'alpaca' ? 'text-green-400' : 'text-yellow-400'}>
                    {dataSource === 'alpaca' ? 'Live Data' : 'Demo Mode'}
                  </span>
                </div> */}
              </div>

              {/* Enhanced Control Bar */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                  isClient && botConfig.enabled
                    ? 'bg-indigo-900/30 text-indigo-300 border-indigo-500/30'
                    : 'bg-gray-900/30 text-gray-400 border-gray-500/30'
                }`}>
                  <CpuChipIcon className="w-4 h-4" />
                  AI Bot: {isClient && botConfig.enabled ? botConfig.mode : 'OFF'}
                </div>

                {/* <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-400">AI Signals: </span>
                  <span className="text-indigo-400 font-medium">{aiStats.totalRecommendations}</span>
                </div> */}


                <button
                  onClick={refreshAIData}
                  disabled={marketLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${marketLoading ? 'animate-spin' : ''}`} />
                  {marketLoading ? 'Refreshing...' : 'Refresh AI'}
                </button>

                <button
                  onClick={toggleBot}
                  disabled={!enhancedAccount?.isConnected}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isClient && botConfig.enabled
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <BotIcon className="w-5 h-5" />
                  {isClient && botConfig.enabled ? 'Disable Bot' : 'Enable Bot'}
                </button>
              </div>
            </div>
          </header>

          {/* Performance Summary Bar */}
          {/* <div className="bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border-b border-indigo-500/30 px-6 py-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-sm">
              <div>
                <div className="text-xs text-indigo-300">AI Signals</div>
                <div className="font-semibold text-indigo-400">{aiStats.totalRecommendations}</div>
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
                <div className="text-xs text-indigo-300">Connection</div>
                <div className={`font-semibold ${enhancedAccount?.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {enhancedAccount?.isConnected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>
          </div> */}

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
                  {/* 🚨 SPOTLIGHT: Enhanced AI TRADING FLOOR - Professional Wall Street Experience */}
                  <section className="relative bg-gradient-to-br from-green-900/30 via-blue-900/30 to-purple-900/30 border-2 border-green-500/50 rounded-xl shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 via-blue-400/5 to-purple-400/5"></div>

                    {/* Enhanced animated background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1)_0%,transparent_50%)] animate-pulse"></div>
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.05)_50%,transparent_75%)] animate-gradient"></div>
                    </div>

                    <div className="relative">
                      {/* Enhanced Wall Street Trading Floor Header */}
                      <div className="bg-gradient-to-r from-green-800/50 to-blue-800/50 p-2 lg:p-4 border-b border-green-500/30">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="relative">
                              {/* <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-xl border-2 border-green-400/30 animate-pulse-slow">
                                <CpuChipIcon className="w-8 h-8 text-white" />
                              </div> */}
                              {isClient && botConfig.enabled && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full animate-pulse border-2 border-gray-900 shadow-lg">
                                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 px-2 py-1 bg-indigo-600 rounded-full text-xs font-bold text-white border border-indigo-400/50">
                                AI
                              </div>
                            </div>
                            <div>
                              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                🏢 AI TRADING FLOOR
                                <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-500 ${
                                  isClient && botConfig.enabled
                                    ? 'bg-green-500/20 text-green-300 border border-green-400/50 shadow-green-400/20 animate-pulse-glow'
                                    : 'bg-red-500/20 text-red-300 border border-red-400/50 shadow-red-400/20'
                                }`}>
                                  {isClient && botConfig.enabled ? '🔴 LIVE TRADING' : '⏸️ STANDBY MODE'}
                                </span>
                              </h2>
                              <p className="text-green-200 text-sm mt-4 flex items-center gap-2 flex-wrap">
                                📊 Real-time Wall Street Operations •
                                <span className="text-blue-300 font-semibold">{botConfig.mode} Mode</span> •
                                <span className="text-purple-300">Min {botConfig.minimumConfidence}% Confidence</span> •
                                <span className="text-cyan-300">{botConfig.watchlistSymbols.length} Assets Monitored</span>
                              </p>
                              {isClient && botConfig.enabled && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-green-300 text-xs">AI Engine Active • Auto-Execution Enabled</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs">
                                    <div className="text-green-300">
                                      Auto-Executed: <span className="font-mono">{autoExecution.executedCount}</span>
                                    </div>
                                    <div className="text-green-300">
                                      Qualifying: <span className="font-mono">{autoExecution.qualifyingRecommendations}</span> ready
                                    </div>
                                    <div className="text-green-300">
                                      Threshold: <span className="font-mono">{Math.max(55, botConfig.minimumConfidence - 10)}%</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Enhanced Live Market Ticker - Wall Street Style */}
                          <div className="text-center lg:text-right">
                            <div className="mb-2">
                              <div className="text-3xl lg:text-4xl font-bold text-green-400 mb-1 font-mono tracking-tight">
                                {enhancedAccount ? formatCurrency(enhancedAccount.totalBalance) : '$100,000'}
                              </div>
                              <div className="text-sm lg:text-md text-green-200 font-medium">Portfolio Value</div>
                              {enhancedAccount?.totalPnL && (
                                <div className={`text-sm font-bold ${getColorClass(enhancedAccount.totalPnL)}`}>
                                  {enhancedAccount.totalPnL >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(enhancedAccount.totalPnL))}
                                  ({formatPercent((enhancedAccount.totalPnL / enhancedAccount.totalBalance) * 100)})
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-3 justify-center lg:justify-end flex-wrap">
                              <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                                isClient && botConfig.enabled
                                  ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50'
                                  : 'bg-red-400 animate-pulse-slow'
                              }`}></div>
                              <span className="text-xs text-gray-300 font-medium">{marketStatus} Market</span>
                              <div className="bg-blue-500/20 px-3 py-0 rounded-full border border-yellow-400">
                                <span className="text-yellow-300 text-xs font-bold">ALPACA API</span>
                              </div>
                              <div className={`px-3 py-1 rounded-full border text-xs font-bold ${
                                enhancedAccount?.isConnected
                                  ? 'bg-green-500/20 text-green-300 border-green-400/30'
                                  : 'bg-red-500/20 text-red-300 border-red-400/30'
                              }`}>
                                {enhancedAccount?.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Bot Activity Monitor - Integrated into Trading Floor */}
                      <div className="p-0 bg-gradient-to-br from-gray-900/50 to-gray-800/50">
                        <AIBotActivityMonitor
                          botEnabled={isClient && botConfig.enabled}
                          mode={botConfig.mode}
                          minimumConfidence={botConfig.minimumConfidence}
                        />
                      </div>

                      {/* Wall Street Floor Ambiance */}
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 opacity-30"></div>
                    </div>
                  </section>

                  {/* AI Performance Overview - Secondary Position */}
                  <section className="bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border border-indigo-500/30 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <SparklesIcon className="w-5 h-5 text-indigo-400" />
                      AI-Enhanced Portfolio Overview
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <BalanceChart account={enhancedAccount} isClient={isClient} />

                      <MarketClock variant="card" showDetails={true} />

                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-indigo-300 mb-3">Real-time Account Status</h4>
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
                            <span className="text-gray-400">Buying Power:</span>
                            <span className="text-yellow-400 font-medium">{enhancedAccount ? formatCurrency(enhancedAccount.availableBuyingPower) : '$0.00'}</span>
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

                      {/* Current Positions Display */}
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                          <ChartBarIcon className="w-4 h-4" />
                          Current Positions ({positions.length})
                        </h4>
                        {positions.length === 0 ? (
                          <div className="text-center py-4">
                            <div className="text-gray-400 text-sm">No open positions</div>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {positions.map((position, index) => (
                              <div key={position.symbol || index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">{position.symbol?.slice(0, 2)}</span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-white">{position.symbol}</div>
                                    <div className="text-xs text-gray-400">{Math.abs(parseFloat(position.quantity || position.qty || '0'))} shares</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-white">
                                    {formatCurrency(parseFloat(position.marketValue || position.market_value || '0'))}
                                  </div>
                                  <div className={`text-xs ${
                                    (parseFloat(position.unrealizedPnL || position.unrealized_pl || '0')) >= 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {(parseFloat(position.unrealizedPnL || position.unrealized_pl || '0')) >= 0 ? '+' : ''}
                                    {formatCurrency(parseFloat(position.unrealizedPnL || position.unrealized_pl || '0'))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-indigo-300 mb-3">AI vs Manual Performance</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">AI Recommendations:</span>
                            <span className="text-indigo-400 font-medium">{aiStats.totalRecommendations}</span>
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
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
                      >
                        View All <ArrowTrendingUpIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {aiRecommendations.slice(0, 6).map(rec => (
                        <div key={rec.id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-indigo-500">
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
                              <CpuChipIcon className="w-3 h-3 text-indigo-400" />
                            </div>
                          </div>
                          <div className="text-sm text-gray-300 mb-1">
                            AI Confidence: <span className="text-indigo-400 font-medium">{rec.confidence}%</span>
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
                          className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm"
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
                        <CpuChipIcon className="w-6 h-6 text-indigo-400" />
                        AI-Powered Trading Recommendations
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{aiRecommendations.length} active signals</span>
                        <span>•</span>
                        <span>{aiRecommendations.filter(r => r.confidence >= 85).length} high confidence</span>
                        <span>•</span>
                        <span>Bot: {isClient && botConfig.enabled ? `Active (${botConfig.mode})` : 'Inactive'}</span>
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
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium"
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
                        <CpuChipIcon className="w-6 h-6 text-indigo-400" />
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
                        <div className={`w-3 h-3 rounded-full ${isClient && botConfig.enabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
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
                            checked={isClient && botConfig.enabled}
                            disabled={!enhancedAccount?.isConnected}
                            onChange={(e) => setBotConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    {isClient && botConfig.enabled && enhancedAccount?.isConnected && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-400 mb-2">
                            <BoltIcon className="w-4 h-4" />
                            <span className="font-medium">Bot Status: ACTIVE - Auto-Execution Enabled</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-green-300">
                              <span className="font-mono text-green-400">{autoExecution.executedCount}</span> executed
                            </div>
                            <div className="text-green-300">
                              <span className="font-mono text-green-400">{autoExecution.qualifyingRecommendations}</span> qualifying
                            </div>
                          </div>
                        </div>
                        <p className="text-green-200 text-sm mb-2">
                          AI bot is monitoring Alpaca markets and automatically executing trades.
                          Current mode: <span className="font-semibold text-green-300">{botConfig.mode}</span> with {botConfig.minimumConfidence}% user threshold.
                        </p>
                        <div className="text-xs text-green-300 bg-green-900/30 rounded p-2">
                          <span className="font-semibold">Auto-Execution:</span> Using dynamic {Math.max(55, botConfig.minimumConfidence - 10)}% threshold (10% buffer below your setting) for better execution opportunities
                        </div>
                      </div>
                    )}

                    {isClient && botConfig.enabled && !enhancedAccount?.isConnected && (
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
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            min="70"
                            max="98"
                            value={botConfig.autoExecuteAbove}
                            disabled={!enhancedAccount?.isConnected}
                            onChange={(e) => setBotConfig(prev => ({ ...prev, autoExecuteAbove: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>70% (Frequent Auto)</span>
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
                            max="50"
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
                      <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-6">
                        <h4 className="font-semibold text-indigo-400 mb-4">Understanding AI Recommendations</h4>
                        <div className="space-y-3 text-sm text-indigo-200">
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