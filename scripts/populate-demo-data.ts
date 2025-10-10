// Script to populate demo data for testing
import { supabaseService } from '../lib/database/supabase-utils'
import { DEMO_USER_ID } from '../lib/auth/auth-utils'

async function populateDemoData() {
  console.log('Populating demo data for user:', DEMO_USER_ID)

  try {
    // Create some sample bot activity logs
    const activities = [
      {
        user_id: DEMO_USER_ID,
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
        type: 'analysis' as const,
        symbol: 'AAPL',
        message: 'Analyzing AAPL market conditions',
        status: 'completed' as const,
        execution_time: 1200,
        metadata: {
          confidence: 0.85,
          indicators: { rsi: 65, macd: 0.5 }
        }
      },
      {
        user_id: DEMO_USER_ID,
        timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 min ago
        type: 'trade' as const,
        symbol: 'TSLA',
        message: 'AI executed BUY 50 TSLA at $245.67',
        status: 'completed' as const,
        execution_time: 800,
        metadata: {
          side: 'buy',
          quantity: 50,
          price: 245.67,
          confidence: 0.78
        }
      },
      {
        user_id: DEMO_USER_ID,
        timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 min ago
        type: 'recommendation' as const,
        symbol: 'MSFT',
        message: 'Generated recommendation for MSFT',
        status: 'completed' as const,
        execution_time: 500,
        metadata: {
          action: 'SELL',
          confidence: 0.72
        }
      }
    ]

    // Insert activities
    for (const activity of activities) {
      await supabaseService.logBotActivity(activity)
    }

    // Create sample AI learning data
    const aiLearningData = [
      {
        user_id: DEMO_USER_ID,
        trade_id: 'trade_001',
        symbol: 'AAPL',
        outcome: 'profit' as const,
        profit_loss: 125.50,
        confidence_score: 0.85,
        market_conditions: {
          entry: { rsi: 45, macd: 0.8, volume_ratio: 1.2 },
          exit: { rsi: 68, macd: 1.1, volume_ratio: 0.9 },
          sentiment_at_entry: { score: 0.7, label: 'positive' },
          trade_duration_hours: 4.5
        },
        sentiment_score: 0.7,
        technical_indicators: { rsi: 45, macd: 0.8, bollinger_position: 0.3 },
        strategy_used: 'ML Enhanced',
        learned_patterns: {
          confidence_vs_outcome: { confidence: 0.85, outcome: 'profit', correlation: 'positive' },
          market_regime: { entry_trend: 'bullish', exit_trend: 'bullish' }
        }
      },
      {
        user_id: DEMO_USER_ID,
        trade_id: 'trade_002',
        symbol: 'TSLA',
        outcome: 'profit' as const,
        profit_loss: 89.30,
        confidence_score: 0.78,
        market_conditions: {
          entry: { rsi: 35, macd: -0.5, volume_ratio: 1.5 },
          exit: { rsi: 55, macd: 0.2, volume_ratio: 1.1 },
          sentiment_at_entry: { score: 0.6, label: 'neutral' },
          trade_duration_hours: 2.3
        },
        sentiment_score: 0.6,
        technical_indicators: { rsi: 35, macd: -0.5, bollinger_position: 0.2 },
        strategy_used: 'Technical Analysis',
        learned_patterns: {
          confidence_vs_outcome: { confidence: 0.78, outcome: 'profit', correlation: 'positive' },
          market_regime: { entry_trend: 'bearish', exit_trend: 'bullish' }
        }
      },
      {
        user_id: DEMO_USER_ID,
        trade_id: 'trade_003',
        symbol: 'MSFT',
        outcome: 'loss' as const,
        profit_loss: -45.20,
        confidence_score: 0.65,
        market_conditions: {
          entry: { rsi: 75, macd: 1.2, volume_ratio: 0.8 },
          exit: { rsi: 72, macd: 0.9, volume_ratio: 0.7 },
          sentiment_at_entry: { score: 0.3, label: 'negative' },
          trade_duration_hours: 1.2
        },
        sentiment_score: 0.3,
        technical_indicators: { rsi: 75, macd: 1.2, bollinger_position: 0.9 },
        strategy_used: 'Sentiment Analysis',
        learned_patterns: {
          confidence_vs_outcome: { confidence: 0.65, outcome: 'loss', correlation: 'negative' },
          market_regime: { entry_trend: 'bullish', exit_trend: 'sideways' }
        }
      },
      {
        user_id: DEMO_USER_ID,
        trade_id: 'trade_004',
        symbol: 'GOOGL',
        outcome: 'profit' as const,
        profit_loss: 215.75,
        confidence_score: 0.92,
        market_conditions: {
          entry: { rsi: 42, macd: 0.6, volume_ratio: 1.3 },
          exit: { rsi: 58, macd: 1.0, volume_ratio: 1.0 },
          sentiment_at_entry: { score: 0.8, label: 'positive' },
          trade_duration_hours: 6.1
        },
        sentiment_score: 0.8,
        technical_indicators: { rsi: 42, macd: 0.6, bollinger_position: 0.4 },
        strategy_used: 'ML Enhanced',
        learned_patterns: {
          confidence_vs_outcome: { confidence: 0.92, outcome: 'profit', correlation: 'positive' },
          market_regime: { entry_trend: 'bullish', exit_trend: 'bullish' }
        }
      },
      {
        user_id: DEMO_USER_ID,
        trade_id: 'trade_005',
        symbol: 'NVDA',
        outcome: 'profit' as const,
        profit_loss: 167.85,
        confidence_score: 0.88,
        market_conditions: {
          entry: { rsi: 38, macd: 0.4, volume_ratio: 1.6 },
          exit: { rsi: 62, macd: 0.8, volume_ratio: 1.2 },
          sentiment_at_entry: { score: 0.75, label: 'positive' },
          trade_duration_hours: 3.8
        },
        sentiment_score: 0.75,
        technical_indicators: { rsi: 38, macd: 0.4, bollinger_position: 0.25 },
        strategy_used: 'Technical Analysis',
        learned_patterns: {
          confidence_vs_outcome: { confidence: 0.88, outcome: 'profit', correlation: 'positive' },
          market_regime: { entry_trend: 'bullish', exit_trend: 'bullish' }
        }
      },
      {
        user_id: DEMO_USER_ID,
        trade_id: 'trade_006',
        symbol: 'SPY',
        outcome: 'breakeven' as const,
        profit_loss: 2.15,
        confidence_score: 0.70,
        market_conditions: {
          entry: { rsi: 50, macd: 0.1, volume_ratio: 1.0 },
          exit: { rsi: 52, macd: 0.15, volume_ratio: 0.95 },
          sentiment_at_entry: { score: 0.5, label: 'neutral' },
          trade_duration_hours: 0.8
        },
        sentiment_score: 0.5,
        technical_indicators: { rsi: 50, macd: 0.1, bollinger_position: 0.5 },
        strategy_used: 'Sentiment Analysis',
        learned_patterns: {
          confidence_vs_outcome: { confidence: 0.70, outcome: 'breakeven', correlation: 'neutral' },
          market_regime: { entry_trend: 'sideways', exit_trend: 'sideways' }
        }
      }
    ]

    // Insert AI learning data
    for (const learningRecord of aiLearningData) {
      await supabaseService.saveAILearningData(learningRecord)
    }

    // Create initial bot metrics
    await supabaseService.updateBotMetrics(DEMO_USER_ID, {
      is_running: false,
      trades_executed: 15,
      recommendations_generated: 8,
      success_rate: 0.78,
      total_pnl: 1250.50,
      daily_pnl: 85.30,
      risk_score: 0.25,
      last_activity: new Date().toISOString()
    })

    console.log('✅ Demo data populated successfully with AI learning data!')

  } catch (error) {
    console.error('❌ Failed to populate demo data:', error)
  }
}

// Run if called directly
if (require.main === module) {
  populateDemoData()
}

export { populateDemoData }