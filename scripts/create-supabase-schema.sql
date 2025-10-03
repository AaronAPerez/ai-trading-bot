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

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own trades" ON trade_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trades" ON trade_history FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own metrics" ON bot_metrics FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own metrics" ON bot_metrics FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own metrics" ON bot_metrics FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own logs" ON bot_activity_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own logs" ON bot_activity_logs FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own learning data" ON ai_learning_data FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own learning data" ON ai_learning_data FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view market sentiment" ON market_sentiment FOR SELECT USING (true);
CREATE POLICY "Service role can insert market sentiment" ON market_sentiment FOR INSERT WITH CHECK (true);

-- Create portfolio_snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  total_value DECIMAL NOT NULL,
  cash DECIMAL NOT NULL,
  equity DECIMAL NOT NULL,
  buying_power DECIMAL NOT NULL,
  long_market_value DECIMAL DEFAULT 0,
  short_market_value DECIMAL DEFAULT 0,
  day_pnl DECIMAL DEFAULT 0,
  total_pnl DECIMAL DEFAULT 0,
  positions_count INTEGER DEFAULT 0,
  positions_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- Create risk_assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
  quantity DECIMAL NOT NULL,
  entry_price DECIMAL NOT NULL,
  stop_loss DECIMAL NOT NULL,
  target_price DECIMAL NOT NULL,
  risk_amount DECIMAL NOT NULL,
  potential_reward DECIMAL NOT NULL,
  risk_reward_ratio DECIMAL NOT NULL,
  position_size_percent DECIMAL NOT NULL,
  account_risk_percent DECIMAL NOT NULL,
  overall_risk_score DECIMAL NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'EXTREME')),
  warnings JSONB,
  recommendations JSONB,
  assessed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_date ON portfolio_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_user_id ON risk_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_symbol ON risk_assessments(symbol);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed_at ON risk_assessments(assessed_at);

-- Enable RLS on new tables
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Users can view own portfolio snapshots" ON portfolio_snapshots FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own portfolio snapshots" ON portfolio_snapshots FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own portfolio snapshots" ON portfolio_snapshots FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own risk assessments" ON risk_assessments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own risk assessments" ON risk_assessments FOR INSERT WITH CHECK (user_id = auth.uid());