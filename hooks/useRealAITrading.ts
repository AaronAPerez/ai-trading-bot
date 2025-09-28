"use client"

import { useCallback } from 'react'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

interface UseRealAITradingProps {
  userId?: string
}

export default function useRealAITrading({
  userId = getCurrentUserId()
}: UseRealAITradingProps = {}) {

  // Save AI trade to Supabase database
  const saveAITrade = useCallback(async (tradeData: {
    symbol: string
    side: 'buy' | 'sell'
    quantity: number
    price: number
    confidence?: number
    strategy?: string
  }) => {
    try {
      const trade = {
        id: `ai-trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        symbol: tradeData.symbol,
        side: tradeData.side,
        quantity: tradeData.quantity,
        price: tradeData.price,
        value: tradeData.quantity * tradeData.price,
        type: 'MARKET' as const,
        status: 'FILLED' as const,
        source: 'AI_BOT' as const,
        confidence: tradeData.confidence || null,
        strategy: tradeData.strategy || 'AI_MOMENTUM',
        fees: tradeData.quantity * tradeData.price * 0.005, // 0.5% fee
        pnl: null, // Will be calculated when position is closed
        created_at: new Date().toISOString(),
        filled_at: new Date().toISOString()
      }

      // Save to Supabase
      await supabaseService.saveTradeHistory(trade)

      // Log AI activity
      await supabaseService.logBotActivity({
        user_id: userId,
        timestamp: new Date().toISOString(),
        type: 'trade',
        symbol: tradeData.symbol,
        message: `AI executed ${tradeData.side.toUpperCase()} ${tradeData.quantity} ${tradeData.symbol} at $${tradeData.price.toFixed(2)}`,
        status: 'completed',
        metadata: {
          symbol: tradeData.symbol,
          side: tradeData.side,
          quantity: tradeData.quantity,
          price: tradeData.price,
          confidence: tradeData.confidence,
          strategy: tradeData.strategy,
          value: tradeData.quantity * tradeData.price
        }
      })

      console.log(`✅ AI Trade saved to database: ${tradeData.side.toUpperCase()} ${tradeData.quantity} ${tradeData.symbol}`)

      return trade
    } catch (error) {
      console.error('Failed to save AI trade:', error)
      throw error
    }
  }, [userId])

  // Save AI learning data
  const saveAILearningData = useCallback(async (learningData: {
    symbol: string
    confidence: number
    predicted_direction: 'UP' | 'DOWN' | 'HOLD'
    actual_direction?: 'UP' | 'DOWN' | 'FLAT'
    accuracy?: number
    pnl?: number
    market_conditions?: any
    technical_indicators?: any
  }) => {
    try {
      const learning = {
        user_id: userId,
        symbol: learningData.symbol,
        confidence: learningData.confidence,
        predicted_direction: learningData.predicted_direction,
        actual_direction: learningData.actual_direction || null,
        accuracy: learningData.accuracy || null,
        pnl: learningData.pnl || null,
        market_conditions: learningData.market_conditions || {},
        technical_indicators: learningData.technical_indicators || {},
        learning_phase: 'ACTIVE',
        created_at: new Date().toISOString()
      }

      await supabaseService.saveAILearningData(learning)
      console.log(`📚 AI Learning data saved: ${learningData.symbol} - ${learningData.predicted_direction}`)

      return learning
    } catch (error) {
      console.error('Failed to save AI learning data:', error)
      throw error
    }
  }, [userId])

  // Update bot metrics
  const updateBotMetrics = useCallback(async (metrics: {
    trades_executed?: number
    total_pnl?: number
    win_rate?: number
    active_positions?: number
    last_trade_time?: Date
  }) => {
    try {
      await supabaseService.updateBotMetrics(userId, {
        trades_executed: metrics.trades_executed,
        total_pnl: metrics.total_pnl,
        win_rate: metrics.win_rate,
        active_positions: metrics.active_positions,
        last_trade_time: metrics.last_trade_time?.toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      })

      console.log('📊 Bot metrics updated')
    } catch (error) {
      console.error('Failed to update bot metrics:', error)
    }
  }, [userId])

  // Enhanced simulation that saves to database
  const simulateAndSaveAITrading = useCallback(async () => {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD', 'NFLX', 'UBER']
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
    const isBuy = Math.random() > 0.5
    const quantity = Math.floor(Math.random() * 100) + 1
    const price = Math.random() * 300 + 50
    const confidence = 0.6 + Math.random() * 0.35 // 60-95%
    const strategies = ['AI_MOMENTUM', 'AI_REVERSAL', 'AI_BREAKOUT', 'AI_SCALPING']
    const strategy = strategies[Math.floor(Math.random() * strategies.length)]

    try {
      // Save the trade to database
      const savedTrade = await saveAITrade({
        symbol: randomSymbol,
        side: isBuy ? 'buy' : 'sell',
        quantity,
        price,
        confidence,
        strategy
      })

      // Save learning data
      await saveAILearningData({
        symbol: randomSymbol,
        confidence,
        predicted_direction: isBuy ? 'UP' : 'DOWN',
        market_conditions: {
          volatility: Math.random() * 0.5,
          volume: Math.floor(Math.random() * 1000000) + 100000,
          momentum: (Math.random() - 0.5) * 0.2
        },
        technical_indicators: {
          rsi: Math.random() * 100,
          macd: (Math.random() - 0.5) * 2,
          bollingerPosition: Math.random()
        }
      })

      // Trigger custom event for UI notifications
      const event = new CustomEvent('ai-trade-executed', {
        detail: {
          symbol: randomSymbol,
          side: isBuy ? 'buy' : 'sell',
          quantity,
          price,
          confidence
        }
      })
      window.dispatchEvent(event)

      return savedTrade
    } catch (error) {
      console.error('Failed to simulate and save AI trading:', error)
      return null
    }
  }, [saveAITrade, saveAILearningData])

  // Fetch real trades from Alpaca API and save to Supabase
  const fetchAndSaveRealTrades = useCallback(async () => {
    try {
      // Fetch real orders from Alpaca API
      const response = await fetch('/api/alpaca/orders?status=filled&limit=10')
      const data = await response.json()

      if (data.success && data.orders) {
        const recentOrders = data.orders.filter((order: any) => {
          const orderTime = new Date(order.filled_at)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          return orderTime > fiveMinutesAgo
        })

        // Save each real trade to Supabase
        for (const order of recentOrders) {
          const trade = {
            id: `alpaca-${order.id}`,
            user_id: userId,
            symbol: order.symbol,
            side: order.side as 'buy' | 'sell',
            quantity: parseFloat(order.filled_qty || order.qty),
            price: parseFloat(order.filled_avg_price || order.limit_price || order.stop_price),
            value: parseFloat(order.filled_qty || order.qty) * parseFloat(order.filled_avg_price || order.limit_price || order.stop_price),
            type: order.type.toUpperCase() as 'MARKET' | 'LIMIT' | 'STOP',
            status: 'FILLED' as const,
            source: 'ALPACA_API' as const,
            confidence: null,
            strategy: 'MANUAL_TRADE',
            fees: parseFloat(order.filled_qty || order.qty) * parseFloat(order.filled_avg_price || order.limit_price || order.stop_price) * 0.005,
            pnl: null,
            timestamp: order.filled_at || order.created_at,
            created_at: order.created_at,
            filled_at: order.filled_at
          }

          await supabaseService.saveTradeHistory(trade)
        }

        // Log activity for monitoring
        if (recentOrders.length > 0) {
          await supabaseService.logBotActivity({
            user_id: userId,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `Fetched ${recentOrders.length} new trades from Alpaca API`,
            status: 'completed',
            metadata: {
              source: 'alpaca_api',
              trades_count: recentOrders.length,
              symbols: recentOrders.map(o => o.symbol)
            }
          })
        }

        console.log(`✅ Fetched and saved ${recentOrders.length} real trades from Alpaca`)
        return recentOrders.length
      }
    } catch (error) {
      console.error('Failed to fetch real trades from Alpaca:', error)
      return 0
    }
  }, [userId])

  return {
    saveAITrade,
    saveAILearningData,
    updateBotMetrics,
    simulateAndSaveAITrading,
    fetchAndSaveRealTrades
  }
}