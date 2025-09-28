import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type TradeHistoryRow = Tables['trade_history']['Row']
type BotActivityLogRow = Tables['bot_activity_logs']['Row']
type BotMetricsRow = Tables['bot_metrics']['Row']
type AILearningDataRow = Tables['ai_learning_data']['Row']
type MarketSentimentRow = Tables['market_sentiment']['Row']

export class TradingStorageService {
  private supabase = createClient()

  // Trade History Methods
  async saveTradeHistory(trade: Omit<TradeHistoryRow, 'id' | 'created_at'>): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('trade_history')
        .insert(trade)
        .select('id')
        .single()

      if (error) {
        console.error('Error saving trade history:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Failed to save trade history:', error)
      return null
    }
  }

  async getTradeHistory(userId: string, limit: number = 100): Promise<TradeHistoryRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('trade_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching trade history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch trade history:', error)
      return []
    }
  }

  // Bot Activity Log Methods
  async logBotActivity(activity: Omit<BotActivityLogRow, 'id' | 'created_at'>): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('bot_activity_logs')
        .insert(activity)
        .select('id')
        .single()

      if (error) {
        console.error('Error logging bot activity:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Failed to log bot activity:', error)
      return null
    }
  }

  async getBotActivityLogs(userId: string, limit: number = 50): Promise<BotActivityLogRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('bot_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching bot activity logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch bot activity logs:', error)
      return []
    }
  }

  // Bot Metrics Methods
  async saveBotMetrics(metrics: Omit<BotMetricsRow, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    try {
      const { data: existing, error: fetchError } = await this.supabase
        .from('bot_metrics')
        .select('id')
        .eq('user_id', metrics.user_id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing metrics:', fetchError)
        return null
      }

      if (existing) {
        const { data, error } = await this.supabase
          .from('bot_metrics')
          .update({ ...metrics, updated_at: new Date().toISOString() })
          .eq('user_id', metrics.user_id)
          .select('id')
          .single()

        if (error) {
          console.error('Error updating bot metrics:', error)
          return null
        }

        return data.id
      } else {
        const { data, error } = await this.supabase
          .from('bot_metrics')
          .insert(metrics)
          .select('id')
          .single()

        if (error) {
          console.error('Error inserting bot metrics:', error)
          return null
        }

        return data.id
      }
    } catch (error) {
      console.error('Failed to save bot metrics:', error)
      return null
    }
  }

  async getBotMetrics(userId: string): Promise<BotMetricsRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('bot_metrics')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        console.error('Error fetching bot metrics:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to fetch bot metrics:', error)
      return null
    }
  }

  // AI Learning Data Methods
  async saveAILearningData(learningData: Omit<AILearningDataRow, 'id' | 'created_at'>): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_learning_data')
        .insert(learningData)
        .select('id')
        .single()

      if (error) {
        console.error('Error saving AI learning data:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Failed to save AI learning data:', error)
      return null
    }
  }

  async getAILearningData(userId: string, symbol?: string): Promise<AILearningDataRow[]> {
    try {
      let query = this.supabase
        .from('ai_learning_data')
        .select('*')
        .eq('user_id', userId)

      if (symbol) {
        query = query.eq('symbol', symbol)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) {
        console.error('Error fetching AI learning data:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch AI learning data:', error)
      return []
    }
  }

  // Market Sentiment Methods
  async saveMarketSentiment(sentiment: Omit<MarketSentimentRow, 'id' | 'created_at'>): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('market_sentiment')
        .insert(sentiment)
        .select('id')
        .single()

      if (error) {
        console.error('Error saving market sentiment:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Failed to save market sentiment:', error)
      return null
    }
  }

  async getLatestMarketSentiment(symbol: string): Promise<MarketSentimentRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('market_sentiment')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        console.error('Error fetching market sentiment:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to fetch market sentiment:', error)
      return null
    }
  }
}

export const tradingStorage = new TradingStorageService()