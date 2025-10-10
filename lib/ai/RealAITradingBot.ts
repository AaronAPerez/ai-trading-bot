/**
 * Real AI Trading Bot - Production Implementation
 * Uses ONLY real Alpaca API and Supabase data
 * 
 * NO MOCKS, NO SIMULATIONS, NO FAKE DATA
 */

import { AlpacaClient } from '@/lib/alpaca/AlpacaClient'
import { supabaseService } from '@/lib/database/supabase-utils'
import { AIRecommendationService } from '@/lib/ai/AIRecommendationService'
import { RiskManagementEngine } from '@/lib/risk/RiskManagementEngine'

export class RealAITradingBot {
  private alpaca: AlpacaClient
  private aiService: AIRecommendationService
  private riskEngine: RiskManagementEngine
  private userId: string
  private isRunning = false
  private scanInterval: NodeJS.Timeout | null = null

  constructor(userId: string) {
    this.alpaca = new AlpacaClient()
    this.aiService = new AIRecommendationService()
    this.riskEngine = new RiskManagementEngine()
    this.userId = userId
  }

  // =============================================
  // START BOT - REAL DATA ONLY
  // =============================================

  async start(config: {
    symbols: string[]
    scanIntervalMinutes: number
    maxPositions: number
    autoExecute: boolean
  }) {
    if (this.isRunning) {
      throw new Error('Bot already running')
    }

    console.log('🤖 Starting REAL AI Trading Bot')
    console.log('📊 Data Sources: Alpaca API + Supabase Database')
    
    this.isRunning = true

    // Initial scan with real data
    await this.scanAndTrade(config)

    // Schedule periodic scans
    this.scanInterval = setInterval(
      () => this.scanAndTrade(config),
      config.scanIntervalMinutes * 60 * 1000
    )

    console.log(`✅ Bot started - scanning every ${config.scanIntervalMinutes} minutes`)
  }

  // =============================================
  // SCAN AND TRADE - REAL EXECUTION
  // =============================================

  private async scanAndTrade(config: any) {
    try {
      console.log('🔍 Scanning markets with REAL data...')

      // 1. Get REAL account data from Alpaca
      const account = await this.alpaca.getAccount()
      const positions = await this.alpaca.getPositions()
      
      console.log(`💰 Real Account - Buying Power: $${account.buying_power}`)
      console.log(`📊 Real Positions: ${positions.length}`)

      // 2. Get REAL market data for each symbol
      for (const symbol of config.symbols) {
        try {
          // Fetch real bars from Alpaca
          const bars = await this.alpaca.getBars(symbol, '1Day', 100)
          
          if (!bars || bars.length === 0) {
            console.log(`⚠️  No real data available for ${symbol}`)
            continue
          }

          // 3. Generate AI recommendation using REAL data
          const recommendation = await this.aiService.generateRecommendation(
            this.userId,
            symbol,
            bars.map(b => ({
              timestamp: new Date(b.t),
              open: b.o,
              high: b.h,
              low: b.l,
              close: b.c,
              volume: b.v
            }))
          )

          // 4. Assess risk with REAL portfolio data
          const riskAssessment = await this.riskEngine.assessTradeRisk({
            userId: this.userId,
            symbol,
            action: recommendation.action,
            quantity: 10, // Will be calculated by position sizing
            entryPrice: bars[bars.length - 1].c,
            stopLoss: recommendation.stopLoss,
            targetPrice: recommendation.targetPrice,
            accountBalance: parseFloat(account.equity)
          })

          // 5. Execute if approved and autoExecute enabled
          if (riskAssessment.approved && config.autoExecute) {
            await this.executeRealTrade(
              symbol,
              recommendation,
              riskAssessment,
              account
            )
          } else {
            // Save recommendation to Supabase for manual review
            await supabaseService.saveAIRecommendation({
              user_id: this.userId,
              symbol,
              action: recommendation.action,
              confidence: recommendation.confidence,
              entry_price: recommendation.entryPrice,
              stop_loss: recommendation.stopLoss,
              target_price: recommendation.targetPrice,
              strategy: recommendation.strategy,
              indicators: recommendation.indicators,
              reasoning: recommendation.reasoning,
              risk_score: riskAssessment.riskScore
            })
          }

        } catch (symbolError) {
          console.error(`Error processing ${symbol}:`, symbolError)
        }
      }

    } catch (error) {
      console.error('❌ Bot scan error:', error)
    }
  }

  // =============================================
  // EXECUTE REAL TRADE
  // =============================================

  private async executeRealTrade(
    symbol: string,
    recommendation: any,
    riskAssessment: any,
    account: any
  ) {
    console.log(`🚀 Executing REAL trade: ${recommendation.action} ${symbol}`)

    try {
      // Calculate position size
      const notionalValue = riskAssessment.sizing.recommendedNotional

      // Place REAL order via Alpaca API
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          notional: notionalValue,
          side: recommendation.action.toLowerCase(),
          type: 'market',
          time_in_force: 'day'
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log(`✅ Real order placed - Order ID: ${result.order.id}`)

        // Save to Supabase database
        await supabaseService.saveTrade({
          user_id: this.userId,
          symbol,
          side: recommendation.action,
          quantity: result.order.qty,
          price: result.order.filled_avg_price || recommendation.entryPrice,
          value: notionalValue,
          type: 'MARKET',
          status: 'FILLED',
          source: 'AI_BOT',
          confidence: recommendation.confidence,
          strategy: recommendation.strategy,
          order_id: result.order.id
        })

        console.log('💾 Trade saved to Supabase')
      } else {
        throw new Error(result.error)
      }

    } catch (error) {
      console.error(`❌ Trade execution failed: ${error.message}`)
    }
  }

  // =============================================
  // STOP BOT
  // =============================================

  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
    this.isRunning = false
    console.log('🛑 Bot stopped')
  }
}