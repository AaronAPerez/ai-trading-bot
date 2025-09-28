"use client"

import { useState, useEffect, useCallback } from 'react'

export interface AIInsight {
  id: string
  timestamp: Date
  type: 'pattern_analysis' | 'sentiment' | 'learning' | 'trade_analysis'
  symbol: string
  message: string
  confidence?: number
  pattern?: string
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  score?: number
  data?: any
}

export interface AIInsightsStreamState {
  insights: AIInsight[]
  isConnected: boolean
  lastUpdate: Date | null
  totalInsights: number
  activeSymbols: Set<string>
  latestAnalysis: AIInsight | null
}

export const useAIInsightsStream = (maxInsights: number = 50) => {
  const [state, setState] = useState<AIInsightsStreamState>({
    insights: [],
    isConnected: false,
    lastUpdate: null,
    totalInsights: 0,
    activeSymbols: new Set(),
    latestAnalysis: null
  })

  // Simulate real-time AI analysis data stream
  const generateAIInsight = useCallback((): AIInsight => {
    const symbols = [
      'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN', 'NFLX',
      'BTC/USD', 'ETH/USD', 'DOGE/USD', 'ADA/USD', 'SOL/USD', 'SPY', 'QQQ'
    ]

    const patterns = ['BULLISH_BREAKOUT', 'BEARISH_REVERSAL', 'MOMENTUM_SHIFT', 'VOLUME_SPIKE', 'TREND_CONTINUATION']
    const sentiments = ['BULLISH', 'BEARISH', 'NEUTRAL'] as const
    const types = ['pattern_analysis', 'sentiment', 'learning', 'trade_analysis'] as const

    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const type = types[Math.floor(Math.random() * types.length)]
    const confidence = 60 + Math.random() * 35 // 60-95%

    let insight: AIInsight = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      symbol,
      message: '',
      confidence: parseFloat(confidence.toFixed(1))
    }

    switch (type) {
      case 'pattern_analysis':
        const pattern = patterns[Math.floor(Math.random() * patterns.length)]
        insight.pattern = pattern
        insight.message = `AI Analyzing ${symbol} | Pattern: ${pattern} | Confidence: ${confidence.toFixed(1)}%`
        break

      case 'sentiment':
        const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)]
        const score = 40 + Math.random() * 60 // 40-100
        insight.sentiment = sentiment
        insight.score = parseFloat(score.toFixed(0))
        insight.message = `Market Sentiment ${symbol}: ${sentiment} (Score: ${score.toFixed(0)}/100)`
        break

      case 'learning':
        insight.message = `Learning from ${symbol}: Updating ML model with Alpaca market data`
        break

      case 'trade_analysis':
        const action = ['BUY', 'SELL', 'HOLD'][Math.floor(Math.random() * 3)]
        insight.message = `Trade Signal ${symbol}: ${action} | AI Confidence: ${confidence.toFixed(1)}%`
        break
    }

    return insight
  }, [])

  // Add new insight to stream
  const addInsight = useCallback((insight: AIInsight) => {
    setState(prevState => {
      const newInsights = [insight, ...prevState.insights].slice(0, maxInsights)
      const activeSymbols = new Set(prevState.activeSymbols)
      activeSymbols.add(insight.symbol)

      // Keep only last 20 active symbols
      if (activeSymbols.size > 20) {
        const symbolsArray = Array.from(activeSymbols)
        const recentSymbols = symbolsArray.slice(-20)
        activeSymbols.clear()
        recentSymbols.forEach(s => activeSymbols.add(s))
      }

      return {
        ...prevState,
        insights: newInsights,
        lastUpdate: new Date(),
        totalInsights: prevState.totalInsights + 1,
        activeSymbols,
        latestAnalysis: insight
      }
    })
  }, [maxInsights])

  // Start AI insights stream
  useEffect(() => {
    setState(prev => ({ ...prev, isConnected: true }))

    // Generate insights at varying intervals to simulate real AI activity
    const intervals = [8000, 12000, 15000, 18000, 22000] // 8-22 seconds
    let timeoutId: NodeJS.Timeout

    const scheduleNextInsight = () => {
      const delay = intervals[Math.floor(Math.random() * intervals.length)]
      timeoutId = setTimeout(() => {
        const insight = generateAIInsight()
        addInsight(insight)
        scheduleNextInsight()
      }, delay)
    }

    // Start with initial insights
    setTimeout(() => {
      addInsight(generateAIInsight())
      scheduleNextInsight()
    }, 2000)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      setState(prev => ({ ...prev, isConnected: false }))
    }
  }, [addInsight, generateAIInsight])

  // Clear insights
  const clearInsights = useCallback(() => {
    setState(prev => ({
      ...prev,
      insights: [],
      totalInsights: 0,
      activeSymbols: new Set(),
      latestAnalysis: null
    }))
  }, [])

  // Get insights by type
  const getInsightsByType = useCallback((type: AIInsight['type']) => {
    return state.insights.filter(insight => insight.type === type)
  }, [state.insights])

  // Get insights by symbol
  const getInsightsBySymbol = useCallback((symbol: string) => {
    return state.insights.filter(insight => insight.symbol === symbol)
  }, [state.insights])

  return {
    ...state,
    addInsight,
    clearInsights,
    getInsightsByType,
    getInsightsBySymbol
  }
}