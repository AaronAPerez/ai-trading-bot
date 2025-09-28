export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      trade_history: {
        Row: {
          filled_at: any
          updated_at: any
          id: string
          user_id: string
          symbol: string
          side: 'buy' | 'sell'
          quantity: number
          price: number
          value: number
          timestamp: string
          status: 'FILLED' | 'PARTIAL' | 'PENDING' | 'REJECTED'
          strategy?: string
          pnl?: number
          fees?: number
          order_id?: string
          ai_confidence?: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          side: 'buy' | 'sell'
          quantity: number
          price: number
          value: number
          timestamp: string
          status: 'FILLED' | 'PARTIAL' | 'PENDING' | 'REJECTED'
          strategy?: string
          pnl?: number
          fees?: number
          order_id?: string
          ai_confidence?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          side?: 'buy' | 'sell'
          quantity?: number
          price?: number
          value?: number
          timestamp?: string
          status?: 'FILLED' | 'PARTIAL' | 'PENDING' | 'REJECTED'
          strategy?: string
          pnl?: number
          fees?: number
          order_id?: string
          ai_confidence?: number
          created_at?: string
        }
      }
      bot_activity_logs: {
        Row: {
          id: string
          user_id: string
          timestamp: string
          type: 'trade' | 'recommendation' | 'risk' | 'system' | 'info' | 'error'
          symbol?: string
          message: string
          status: 'completed' | 'failed' | 'pending'
          execution_time?: number
          details?: string
          metadata?: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timestamp: string
          type: 'trade' | 'recommendation' | 'risk' | 'system' | 'info' | 'error'
          symbol?: string
          message: string
          status: 'completed' | 'failed' | 'pending'
          execution_time?: number
          details?: string
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timestamp?: string
          type?: 'trade' | 'recommendation' | 'risk' | 'system' | 'info' | 'error'
          symbol?: string
          message?: string
          status?: 'completed' | 'failed' | 'pending'
          execution_time?: number
          details?: string
          metadata?: Record<string, any>
          created_at?: string
        }
      }
      bot_metrics: {
        Row: {
          id: string
          user_id: string
          is_running: boolean
          uptime: number
          trades_executed: number
          recommendations_generated: number
          success_rate: number
          total_pnl: number
          daily_pnl: number
          risk_score: number
          last_activity?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          is_running: boolean
          uptime: number
          trades_executed: number
          recommendations_generated: number
          success_rate: number
          total_pnl: number
          daily_pnl: number
          risk_score: number
          last_activity?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          is_running?: boolean
          uptime?: number
          trades_executed?: number
          recommendations_generated?: number
          success_rate?: number
          total_pnl?: number
          daily_pnl?: number
          risk_score?: number
          last_activity?: string
          created_at?: string
          updated_at?: string
        }
      }
      ai_learning_data: {
        Row: {
          id: string
          user_id: string
          trade_id?: string
          symbol: string
          outcome: 'profit' | 'loss' | 'breakeven'
          profit_loss: number
          confidence_score: number
          market_conditions: Record<string, any>
          sentiment_score?: number
          technical_indicators: Record<string, any>
          strategy_used: string
          learned_patterns?: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trade_id?: string
          symbol: string
          outcome: 'profit' | 'loss' | 'breakeven'
          profit_loss: number
          confidence_score: number
          market_conditions: Record<string, any>
          sentiment_score?: number
          technical_indicators: Record<string, any>
          strategy_used: string
          learned_patterns?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trade_id?: string
          symbol?: string
          outcome?: 'profit' | 'loss' | 'breakeven'
          profit_loss?: number
          confidence_score?: number
          market_conditions?: Record<string, any>
          sentiment_score?: number
          technical_indicators?: Record<string, any>
          strategy_used?: string
          learned_patterns?: Record<string, any>
          created_at?: string
        }
      }
      market_sentiment: {
        Row: {
          id: string
          symbol: string
          sentiment_score: number
          sentiment_label: 'positive' | 'negative' | 'neutral'
          news_count: number
          social_mentions?: number
          source: 'news_api' | 'social_media' | 'combined'
          data_points: Record<string, any>
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          symbol: string
          sentiment_score: number
          sentiment_label: 'positive' | 'negative' | 'neutral'
          news_count: number
          social_mentions?: number
          source: 'news_api' | 'social_media' | 'combined'
          data_points: Record<string, any>
          timestamp: string
          created_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          sentiment_score?: number
          sentiment_label?: 'positive' | 'negative' | 'neutral'
          news_count?: number
          social_mentions?: number
          source?: 'news_api' | 'social_media' | 'combined'
          data_points?: Record<string, any>
          timestamp?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}