export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_learning_data: {
        Row: {
          confidence_level: number | null
          confidence_score: number
          created_at: string | null
          id: string
          learned_patterns: Json | null
          market_conditions: Json
          outcome: string
          profit_loss: number
          sentiment_score: number | null
          strategy_used: string
          symbol: string
          technical_indicators: Json
          trade_id: string | null
          user_id: string
        }
        Insert: {
          confidence_level?: number | null
          confidence_score: number
          created_at?: string | null
          id?: string
          learned_patterns?: Json | null
          market_conditions: Json
          outcome: string
          profit_loss: number
          sentiment_score?: number | null
          strategy_used: string
          symbol: string
          technical_indicators: Json
          trade_id?: string | null
          user_id: string
        }
        Update: {
          confidence_level?: number | null
          confidence_score?: number
          created_at?: string | null
          id?: string
          learned_patterns?: Json | null
          market_conditions?: Json
          outcome?: string
          profit_loss?: number
          sentiment_score?: number | null
          strategy_used?: string
          symbol?: string
          technical_indicators?: Json
          trade_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_signals: {
        Row: {
          ai_model: string
          confidence: number
          created_at: string | null
          executed: boolean | null
          executed_at: string | null
          execution_reason: string | null
          execution_status: string | null
          expected_return: number | null
          expires_at: string | null
          id: string
          market_conditions: Json | null
          position_size: number | null
          reasoning: string | null
          risk_score: number | null
          signal_type: string
          stop_loss_price: number | null
          strategy_id: string
          strength: number
          symbol: string
          take_profit_price: number | null
          technical_indicators: Json | null
          trade_id: string | null
          user_id: string
        }
        Insert: {
          ai_model: string
          confidence: number
          created_at?: string | null
          executed?: boolean | null
          executed_at?: string | null
          execution_reason?: string | null
          execution_status?: string | null
          expected_return?: number | null
          expires_at?: string | null
          id?: string
          market_conditions?: Json | null
          position_size?: number | null
          reasoning?: string | null
          risk_score?: number | null
          signal_type: string
          stop_loss_price?: number | null
          strategy_id: string
          strength: number
          symbol: string
          take_profit_price?: number | null
          technical_indicators?: Json | null
          trade_id?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string
          confidence?: number
          created_at?: string | null
          executed?: boolean | null
          executed_at?: string | null
          execution_reason?: string | null
          execution_status?: string | null
          expected_return?: number | null
          expires_at?: string | null
          id?: string
          market_conditions?: Json | null
          position_size?: number | null
          reasoning?: string | null
          risk_score?: number | null
          signal_type?: string
          stop_loss_price?: number | null
          strategy_id?: string
          strength?: number
          symbol?: string
          take_profit_price?: number | null
          technical_indicators?: Json | null
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_signals_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_signals_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_signals_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_activity_logs: {
        Row: {
          created_at: string | null
          details: string | null
          execution_time: number | null
          id: string
          message: string
          metadata: Json | null
          status: string
          symbol: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          execution_time?: number | null
          id?: string
          message: string
          metadata?: Json | null
          status: string
          symbol?: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          execution_time?: number | null
          id?: string
          message?: string
          metadata?: Json | null
          status?: string
          symbol?: string | null
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_metrics: {
        Row: {
          created_at: string | null
          daily_pnl: number
          id: string
          is_running: boolean
          last_activity: string | null
          recommendations_generated: number
          risk_score: number
          success_rate: number
          total_pnl: number
          trades_executed: number
          updated_at: string | null
          uptime: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_pnl?: number
          id?: string
          is_running?: boolean
          last_activity?: string | null
          recommendations_generated?: number
          risk_score?: number
          success_rate?: number
          total_pnl?: number
          trades_executed?: number
          updated_at?: string | null
          uptime?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_pnl?: number
          id?: string
          is_running?: boolean
          last_activity?: string | null
          recommendations_generated?: number
          risk_score?: number
          success_rate?: number
          total_pnl?: number
          trades_executed?: number
          updated_at?: string | null
          uptime?: number
          user_id?: string
        }
        Relationships: []
      }
      market_sentiment: {
        Row: {
          created_at: string | null
          data_points: Json
          id: string
          news_count: number
          sentiment_label: string
          sentiment_score: number
          social_mentions: number | null
          source: string
          symbol: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          data_points: Json
          id?: string
          news_count: number
          sentiment_label: string
          sentiment_score: number
          social_mentions?: number | null
          source: string
          symbol: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          data_points?: Json
          id?: string
          news_count?: number
          sentiment_label?: string
          sentiment_score?: number
          social_mentions?: number | null
          source?: string
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          read_at: string | null
          severity: string | null
          signal_id: string | null
          title: string
          trade_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          severity?: string | null
          signal_id?: string | null
          title: string
          trade_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          severity?: string | null
          signal_id?: string | null
          title?: string
          trade_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "ai_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          extended_hours: boolean | null
          filled_at: string | null
          filled_avg_price: number | null
          filled_qty: number | null
          id: string
          limit_price: number | null
          notional: number | null
          order_class: string | null
          order_id: string
          qty: number | null
          side: string
          status: string
          stop_price: number | null
          submitted_at: string
          symbol: string
          time_in_force: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          extended_hours?: boolean | null
          filled_at?: string | null
          filled_avg_price?: number | null
          filled_qty?: number | null
          id?: string
          limit_price?: number | null
          notional?: number | null
          order_class?: string | null
          order_id: string
          qty?: number | null
          side: string
          status: string
          stop_price?: number | null
          submitted_at: string
          symbol: string
          time_in_force?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          extended_hours?: boolean | null
          filled_at?: string | null
          filled_avg_price?: number | null
          filled_qty?: number | null
          id?: string
          limit_price?: number | null
          notional?: number | null
          order_class?: string | null
          order_id?: string
          qty?: number | null
          side?: string
          status?: string
          stop_price?: number | null
          submitted_at?: string
          symbol?: string
          time_in_force?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          account_id: string | null
          ai_return: number | null
          ai_trades: number | null
          ai_win_rate: number | null
          avg_holding_period: number | null
          avg_losing_trade: number | null
          avg_trade_return: number | null
          avg_winning_trade: number | null
          calculated_at: string | null
          created_at: string | null
          id: string
          largest_loss: number | null
          largest_win: number | null
          losing_trades: number | null
          manual_return: number | null
          manual_trades: number | null
          manual_win_rate: number | null
          max_drawdown: number | null
          period_end: string
          period_start: string
          period_type: string
          profit_factor: number | null
          sharpe_ratio: number | null
          total_return: number | null
          total_return_percent: number | null
          total_trades: number | null
          user_id: string
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          account_id?: string | null
          ai_return?: number | null
          ai_trades?: number | null
          ai_win_rate?: number | null
          avg_holding_period?: number | null
          avg_losing_trade?: number | null
          avg_trade_return?: number | null
          avg_winning_trade?: number | null
          calculated_at?: string | null
          created_at?: string | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          losing_trades?: number | null
          manual_return?: number | null
          manual_trades?: number | null
          manual_win_rate?: number | null
          max_drawdown?: number | null
          period_end: string
          period_start: string
          period_type: string
          profit_factor?: number | null
          sharpe_ratio?: number | null
          total_return?: number | null
          total_return_percent?: number | null
          total_trades?: number | null
          user_id: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          account_id?: string | null
          ai_return?: number | null
          ai_trades?: number | null
          ai_win_rate?: number | null
          avg_holding_period?: number | null
          avg_losing_trade?: number | null
          avg_trade_return?: number | null
          avg_winning_trade?: number | null
          calculated_at?: string | null
          created_at?: string | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          losing_trades?: number | null
          manual_return?: number | null
          manual_trades?: number | null
          manual_win_rate?: number | null
          max_drawdown?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          profit_factor?: number | null
          sharpe_ratio?: number | null
          total_return?: number | null
          total_return_percent?: number | null
          total_trades?: number | null
          user_id?: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          account_id: string | null
          cash_balance: number
          created_at: string | null
          daily_pnl: number | null
          daily_pnl_percentage: number | null
          id: string
          positions_snapshot: Json | null
          positions_value: number
          snapshot_date: string
          total_value: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          cash_balance: number
          created_at?: string | null
          daily_pnl?: number | null
          daily_pnl_percentage?: number | null
          id?: string
          positions_snapshot?: Json | null
          positions_value: number
          snapshot_date: string
          total_value: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          cash_balance?: number
          created_at?: string | null
          daily_pnl?: number | null
          daily_pnl_percentage?: number | null
          id?: string
          positions_snapshot?: Json | null
          positions_value?: number
          snapshot_date?: string
          total_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          account_id: string | null
          acquisition_strategy_id: string | null
          ai_acquired: boolean | null
          avg_entry_price: number
          cost_basis: number | null
          current_price: number | null
          daily_pl: number | null
          id: string
          market_value: number | null
          opened_at: string | null
          quantity: number
          side: string
          symbol: string
          unrealized_pl: number | null
          unrealized_pl_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          acquisition_strategy_id?: string | null
          ai_acquired?: boolean | null
          avg_entry_price: number
          cost_basis?: number | null
          current_price?: number | null
          daily_pl?: number | null
          id?: string
          market_value?: number | null
          opened_at?: string | null
          quantity: number
          side: string
          symbol: string
          unrealized_pl?: number | null
          unrealized_pl_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          acquisition_strategy_id?: string | null
          ai_acquired?: boolean | null
          avg_entry_price?: number
          cost_basis?: number | null
          current_price?: number | null
          daily_pl?: number | null
          id?: string
          market_value?: number | null
          opened_at?: string | null
          quantity?: number
          side?: string
          symbol?: string
          unrealized_pl?: number | null
          unrealized_pl_percent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_acquisition_strategy_id_fkey"
            columns: ["acquisition_strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_acquisition_strategy_id_fkey"
            columns: ["acquisition_strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_balance: number | null
          api_keys_configured: boolean | null
          auto_execution_enabled: boolean | null
          auto_execution_threshold: number | null
          avatar_url: string | null
          created_at: string | null
          daily_risk_limit: number | null
          default_trading_mode: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          live_trading_enabled: boolean | null
          max_daily_trades: number | null
          notification_preferences: Json | null
          preferred_strategies: string[] | null
          risk_tolerance: string | null
          role: string | null
          subscription_tier: string | null
          trading_experience: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          account_balance?: number | null
          api_keys_configured?: boolean | null
          auto_execution_enabled?: boolean | null
          auto_execution_threshold?: number | null
          avatar_url?: string | null
          created_at?: string | null
          daily_risk_limit?: number | null
          default_trading_mode?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          live_trading_enabled?: boolean | null
          max_daily_trades?: number | null
          notification_preferences?: Json | null
          preferred_strategies?: string[] | null
          risk_tolerance?: string | null
          role?: string | null
          subscription_tier?: string | null
          trading_experience?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          account_balance?: number | null
          api_keys_configured?: boolean | null
          auto_execution_enabled?: boolean | null
          auto_execution_threshold?: number | null
          avatar_url?: string | null
          created_at?: string | null
          daily_risk_limit?: number | null
          default_trading_mode?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          live_trading_enabled?: boolean | null
          max_daily_trades?: number | null
          notification_preferences?: Json | null
          preferred_strategies?: string[] | null
          risk_tolerance?: string | null
          role?: string | null
          subscription_tier?: string | null
          trading_experience?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      strategy_presets: {
        Row: {
          confidence_threshold: number | null
          config: Json
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          max_position_size: number | null
          name: string
          strategy_type: string | null
          successful_signals: number | null
          total_return: number | null
          total_signals: number | null
          updated_at: string | null
          user_id: string | null
          win_rate: number | null
        }
        Insert: {
          confidence_threshold?: number | null
          config: Json
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          max_position_size?: number | null
          name: string
          strategy_type?: string | null
          successful_signals?: number | null
          total_return?: number | null
          total_signals?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Update: {
          confidence_threshold?: number | null
          config?: Json
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          max_position_size?: number | null
          name?: string
          strategy_type?: string | null
          successful_signals?: number | null
          total_return?: number | null
          total_signals?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      strategy_simulations: {
        Row: {
          duration: unknown | null
          entry_price: number | null
          exit_price: number | null
          id: string
          notes: string | null
          pnl: number | null
          quantity: number | null
          side: string | null
          simulated_at: string | null
          strategy_id: string | null
          symbol: string | null
          user_id: string | null
        }
        Insert: {
          duration?: unknown | null
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          pnl?: number | null
          quantity?: number | null
          side?: string | null
          simulated_at?: string | null
          strategy_id?: string | null
          symbol?: string | null
          user_id?: string | null
        }
        Update: {
          duration?: unknown | null
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          pnl?: number | null
          quantity?: number | null
          side?: string | null
          simulated_at?: string | null
          strategy_id?: string | null
          symbol?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_simulations_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_simulations_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_validations: {
        Row: {
          account_id: string | null
          avg_holding_period: number | null
          avg_trade_return: number | null
          best_trade: number | null
          completed_trades: number | null
          confidence_score: number | null
          created_at: string | null
          current_max_drawdown: number | null
          current_sharpe_ratio: number | null
          current_win_rate: number | null
          id: string
          is_valid: boolean | null
          max_drawdown_limit: number | null
          min_sharpe_ratio: number | null
          min_win_rate: number | null
          profit_factor: number | null
          ready_for_live: boolean | null
          recommendations: Json | null
          required_trades: number | null
          risk_factors: Json | null
          risk_level: string | null
          total_return: number | null
          updated_at: string | null
          user_id: string
          validated_at: string | null
          worst_trade: number | null
        }
        Insert: {
          account_id?: string | null
          avg_holding_period?: number | null
          avg_trade_return?: number | null
          best_trade?: number | null
          completed_trades?: number | null
          confidence_score?: number | null
          created_at?: string | null
          current_max_drawdown?: number | null
          current_sharpe_ratio?: number | null
          current_win_rate?: number | null
          id?: string
          is_valid?: boolean | null
          max_drawdown_limit?: number | null
          min_sharpe_ratio?: number | null
          min_win_rate?: number | null
          profit_factor?: number | null
          ready_for_live?: boolean | null
          recommendations?: Json | null
          required_trades?: number | null
          risk_factors?: Json | null
          risk_level?: string | null
          total_return?: number | null
          updated_at?: string | null
          user_id: string
          validated_at?: string | null
          worst_trade?: number | null
        }
        Update: {
          account_id?: string | null
          avg_holding_period?: number | null
          avg_trade_return?: number | null
          best_trade?: number | null
          completed_trades?: number | null
          confidence_score?: number | null
          created_at?: string | null
          current_max_drawdown?: number | null
          current_sharpe_ratio?: number | null
          current_win_rate?: number | null
          id?: string
          is_valid?: boolean | null
          max_drawdown_limit?: number | null
          min_sharpe_ratio?: number | null
          min_win_rate?: number | null
          profit_factor?: number | null
          ready_for_live?: boolean | null
          recommendations?: Json | null
          required_trades?: number | null
          risk_factors?: Json | null
          risk_level?: string | null
          total_return?: number | null
          updated_at?: string | null
          user_id?: string
          validated_at?: string | null
          worst_trade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_validations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_history: {
        Row: {
          ai_confidence: number | null
          created_at: string | null
          fees: number | null
          id: string
          order_id: string | null
          pnl: number | null
          price: number
          quantity: number
          side: string
          status: string
          strategy: string | null
          symbol: string
          timestamp: string
          user_id: string
          value: number
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string | null
          fees?: number | null
          id?: string
          order_id?: string | null
          pnl?: number | null
          price: number
          quantity: number
          side: string
          status: string
          strategy?: string | null
          symbol: string
          timestamp: string
          user_id: string
          value: number
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string | null
          fees?: number | null
          id?: string
          order_id?: string | null
          pnl?: number | null
          price?: number
          quantity?: number
          side?: string
          status?: string
          strategy?: string | null
          symbol?: string
          timestamp?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      trades: {
        Row: {
          account_type: string | null
          ai_model: string | null
          ai_reasoning: string | null
          broker_order_id: string | null
          commission: number | null
          confidence: number | null
          created_at: string | null
          entry_time: string | null
          execution_type: string | null
          exit_time: string | null
          expected_return: number | null
          filled_at: string | null
          id: string
          order_type: string | null
          pnl: number | null
          price: number | null
          quantity: number | null
          risk_score: number | null
          roi: number | null
          side: string | null
          status: string | null
          strategy: string | null
          strategy_config: Json | null
          symbol: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          ai_model?: string | null
          ai_reasoning?: string | null
          broker_order_id?: string | null
          commission?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_time?: string | null
          execution_type?: string | null
          exit_time?: string | null
          expected_return?: number | null
          filled_at?: string | null
          id: string
          order_type?: string | null
          pnl?: number | null
          price?: number | null
          quantity?: number | null
          risk_score?: number | null
          roi?: number | null
          side?: string | null
          status?: string | null
          strategy?: string | null
          strategy_config?: Json | null
          symbol?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          ai_model?: string | null
          ai_reasoning?: string | null
          broker_order_id?: string | null
          commission?: number | null
          confidence?: number | null
          created_at?: string | null
          entry_time?: string | null
          execution_type?: string | null
          exit_time?: string | null
          expected_return?: number | null
          filled_at?: string | null
          id?: string
          order_type?: string | null
          pnl?: number | null
          price?: number | null
          quantity?: number | null
          risk_score?: number | null
          roi?: number | null
          side?: string | null
          status?: string | null
          strategy?: string | null
          strategy_config?: Json | null
          symbol?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trading_accounts: {
        Row: {
          account_id: string
          account_number: string | null
          account_type: string
          broker: string | null
          buying_power: number | null
          created_at: string | null
          current_balance: number | null
          id: string
          initial_balance: number | null
          is_active: boolean | null
          is_validated: boolean | null
          portfolio_value: number | null
          updated_at: string | null
          validation_date: string | null
        }
        Insert: {
          account_id: string
          account_number?: string | null
          account_type: string
          broker?: string | null
          buying_power?: number | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          is_validated?: boolean | null
          portfolio_value?: number | null
          updated_at?: string | null
          validation_date?: string | null
        }
        Update: {
          account_id?: string
          account_number?: string | null
          account_type?: string
          broker?: string | null
          buying_power?: number | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          is_validated?: boolean | null
          portfolio_value?: number | null
          updated_at?: string | null
          validation_date?: string | null
        }
        Relationships: []
      }
      trading_strategies: {
        Row: {
          confidence_threshold: number | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          max_position_size: number | null
          name: string
          risk_multiplier: number | null
          strategy_type: string
          successful_signals: number | null
          total_return: number | null
          total_signals: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          confidence_threshold?: number | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          max_position_size?: number | null
          name: string
          risk_multiplier?: number | null
          strategy_type: string
          successful_signals?: number | null
          total_return?: number | null
          total_signals?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          confidence_threshold?: number | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          max_position_size?: number | null
          name?: string
          risk_multiplier?: number | null
          strategy_type?: string
          successful_signals?: number | null
          total_return?: number | null
          total_signals?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          alpaca_api_key_encrypted: string | null
          alpaca_base_url: string | null
          alpaca_paper_trading: boolean | null
          alpaca_secret_key_encrypted: string | null
          created_at: string | null
          id: string
          last_used_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alpaca_api_key_encrypted?: string | null
          alpaca_base_url?: string | null
          alpaca_paper_trading?: boolean | null
          alpaca_secret_key_encrypted?: string | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alpaca_api_key_encrypted?: string | null
          alpaca_base_url?: string | null
          alpaca_paper_trading?: boolean | null
          alpaca_secret_key_encrypted?: string | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auto_execution_enabled: boolean | null
          auto_execution_threshold: number | null
          avatar_url: string | null
          created_at: string | null
          daily_risk_limit: number | null
          default_trading_mode: string | null
          email: string
          experience_level: string | null
          full_name: string | null
          id: string
          max_daily_trades: number | null
          risk_tolerance: string | null
          updated_at: string | null
        }
        Insert: {
          auto_execution_enabled?: boolean | null
          auto_execution_threshold?: number | null
          avatar_url?: string | null
          created_at?: string | null
          daily_risk_limit?: number | null
          default_trading_mode?: string | null
          email: string
          experience_level?: string | null
          full_name?: string | null
          id: string
          max_daily_trades?: number | null
          risk_tolerance?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_execution_enabled?: boolean | null
          auto_execution_threshold?: number | null
          avatar_url?: string | null
          created_at?: string | null
          daily_risk_limit?: number | null
          default_trading_mode?: string | null
          email?: string
          experience_level?: string | null
          full_name?: string | null
          id?: string
          max_daily_trades?: number | null
          risk_tolerance?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      strategy_performance: {
        Row: {
          avg_pnl: number | null
          confidence_threshold: number | null
          config: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          executed_trades: number | null
          id: string | null
          max_position_size: number | null
          name: string | null
          recent_trades: number | null
          strategy_type: string | null
          successful_signals: number | null
          total_return: number | null
          total_signals: number | null
          updated_at: string | null
          user_id: string | null
          win_rate: number | null
          winning_trades_count: number | null
        }
        Relationships: []
      }
      trading_dashboard: {
        Row: {
          account_balance: number | null
          account_type: string | null
          buying_power: number | null
          confidence_score: number | null
          current_balance: number | null
          current_win_rate: number | null
          email: string | null
          first_name: string | null
          last_name: string | null
          live_trading_enabled: boolean | null
          open_positions: number | null
          portfolio_value: number | null
          ready_for_live: boolean | null
          total_trades: number | null
          unread_notifications: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_all_old_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleanup_type: string
          message: string
          status: string
        }[]
      }
      cleanup_old_activity_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_ai_learning_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_market_sentiment: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_trade_history: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_database_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          indexes_size: string
          row_count: number
          table_name: string
          table_size: string
          total_size: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
