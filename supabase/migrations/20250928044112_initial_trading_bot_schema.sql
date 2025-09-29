-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trade_history table
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  value DECIMAL NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('FILLED', 'PARTIAL', 'PENDING', 'REJECTED')),
  strategy TEXT,
  pnl DECIMAL,
  fees DECIMAL,
  order_id TEXT,
  ai_confidence DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bot_metrics table
CREATE TABLE IF NOT EXISTS bot_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_running BOOLEAN NOT NULL DEFAULT FALSE,
  uptime BIGINT NOT NULL DEFAULT 0,
  trades_executed INTEGER NOT NULL DEFAULT 0,
  recommendations_generated INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL NOT NULL DEFAULT 0,
  total_pnl DECIMAL NOT NULL DEFAULT 0,
  daily_pnl DECIMAL NOT NULL DEFAULT 0,
  risk_score DECIMAL NOT NULL DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bot_activity_logs table
CREATE TABLE IF NOT EXISTS bot_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('trade', 'recommendation', 'risk', 'system', 'info', 'error')),
  symbol TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'pending')),
  execution_time INTEGER,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_learning_data table
CREATE TABLE IF NOT EXISTS ai_learning_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trade_id UUID,
  symbol TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('profit', 'loss', 'breakeven')),
  profit_loss DECIMAL NOT NULL,
  confidence_score DECIMAL NOT NULL,
  market_conditions JSONB NOT NULL,
  sentiment_score DECIMAL,
  technical_indicators JSONB NOT NULL,
  strategy_used TEXT NOT NULL,
  learned_patterns JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create market_sentiment table
CREATE TABLE IF NOT EXISTS market_sentiment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  sentiment_score DECIMAL NOT NULL,
  sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  news_count INTEGER NOT NULL,
  social_mentions INTEGER,
  source TEXT NOT NULL CHECK (source IN ('news_api', 'social_media', 'combined')),
  data_points JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trade_history_user_id ON trade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_history_timestamp ON trade_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_bot_activity_logs_user_id ON bot_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_activity_logs_timestamp ON bot_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_user_id ON ai_learning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_symbol ON ai_learning_data(symbol);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_symbol ON market_sentiment(symbol);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_timestamp ON market_sentiment(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_sentiment ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (DROP IF EXISTS to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own trades" ON trade_history;
DROP POLICY IF EXISTS "Users can insert own trades" ON trade_history;

CREATE POLICY "Users can view own trades" ON trade_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trades" ON trade_history FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own metrics" ON bot_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON bot_metrics;
DROP POLICY IF EXISTS "Users can insert own metrics" ON bot_metrics;

CREATE POLICY "Users can view own metrics" ON bot_metrics FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own metrics" ON bot_metrics FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own metrics" ON bot_metrics FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own logs" ON bot_activity_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON bot_activity_logs;

CREATE POLICY "Users can view own logs" ON bot_activity_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own logs" ON bot_activity_logs FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own learning data" ON ai_learning_data;
DROP POLICY IF EXISTS "Users can insert own learning data" ON ai_learning_data;

CREATE POLICY "Users can view own learning data" ON ai_learning_data FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own learning data" ON ai_learning_data FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view market sentiment" ON market_sentiment;
DROP POLICY IF EXISTS "Service role can insert market sentiment" ON market_sentiment;

CREATE POLICY "Anyone can view market sentiment" ON market_sentiment FOR SELECT USING (true);
CREATE POLICY "Service role can insert market sentiment" ON market_sentiment FOR INSERT WITH CHECK (true);