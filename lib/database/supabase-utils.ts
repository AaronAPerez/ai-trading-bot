import { supabase, createServerSupabaseClient } from '../supabaseClient'
import { Database } from '../../types/supabase'

type Tables = Database['public']['Tables']
type TradeHistory = Tables['trade_history']['Row']
type BotMetrics = Tables['bot_metrics']['Row']
type BotActivityLog = Tables['bot_activity_logs']['Row']
type AILearningData = Tables['ai_learning_data']['Row']
type MarketSentiment = Tables['market_sentiment']['Row']
type Profile = Tables['profiles']['Row']

export class SupabaseService {
  private client = supabase
  private serverClient = createServerSupabaseClient()

  async saveTradeHistory(trade: Tables['trade_history']['Insert']) {
    const { data, error } = await this.client
      .from('trade_history')
      .insert(trade)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getTradeHistory(userId: string, limit = 50): Promise<TradeHistory[]> {
    const { data, error } = await this.client
      .from('trade_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async updateBotMetrics(userId: string, metrics: Tables['bot_metrics']['Update']) {
    const { data, error } = await this.client
      .from('bot_metrics')
      .upsert({
        user_id: userId,
        ...metrics,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getBotMetrics(userId: string): Promise<BotMetrics | null> {
    const { data, error } = await this.client
      .from('bot_metrics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async logBotActivity(log: Tables['bot_activity_logs']['Insert']) {
    const { data, error } = await this.client
      .from('bot_activity_logs')
      .insert(log)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getBotActivityLogs(userId: string, limit = 100): Promise<BotActivityLog[]> {
    const { data, error } = await this.client
      .from('bot_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async saveAILearningData(learning: Tables['ai_learning_data']['Insert']) {
    const { data, error } = await this.client
      .from('ai_learning_data')
      .insert(learning)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAILearningData(userId: string, symbol?: string): Promise<AILearningData[]> {
    let query = this.client
      .from('ai_learning_data')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (symbol) {
      query = query.eq('symbol', symbol)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async saveMarketSentiment(sentiment: Tables['market_sentiment']['Insert']) {
    const { data, error } = await this.client
      .from('market_sentiment')
      .insert(sentiment)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getLatestMarketSentiment(symbol: string): Promise<MarketSentiment | null> {
    const { data, error } = await this.client
      .from('market_sentiment')
      .select('*')
      .eq('symbol', symbol)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async createOrUpdateProfile(profile: Tables['profiles']['Insert']) {
    const { data, error } = await this.client
      .from('profiles')
      .upsert(profile)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async getPortfolioSummary(userId: string) {
    const { data: trades, error } = await this.client
      .from('trade_history')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'FILLED')

    if (error) throw error

    const summary = trades?.reduce((acc, trade) => {
      const value = trade.side === 'buy' ? -trade.value : trade.value
      acc.totalInvested += trade.side === 'buy' ? trade.value : 0
      acc.totalPnL += trade.pnl || 0
      acc.totalFees += trade.fees || 0
      acc.totalTrades += 1

      if (trade.pnl && trade.pnl > 0) {
        acc.winningTrades += 1
      }

      return acc
    }, {
      totalInvested: 0,
      totalPnL: 0,
      totalFees: 0,
      totalTrades: 0,
      winningTrades: 0
    })

    return {
      ...summary,
      winRate: summary?.totalTrades > 0 ? (summary.winningTrades / summary.totalTrades) * 100 : 0
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('count(*)')
        .limit(1)

      return !error
    } catch (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
  }
}

export const supabaseService = new SupabaseService()