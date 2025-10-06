export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_learning_data: {
        Row: {
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
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
