-- Multi-Strategy Performance Tracking Tables

-- Drop existing view if it exists
DROP VIEW IF EXISTS strategy_performance CASCADE;

-- Strategy Performance Summary Table
CREATE TABLE IF NOT EXISTS strategy_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  failed_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  total_pnl DECIMAL(12,2) DEFAULT 0,
  average_pnl DECIMAL(12,2) DEFAULT 0,
  sharpe_ratio DECIMAL(8,4) DEFAULT 0,
  max_drawdown DECIMAL(12,2) DEFAULT 0,
  current_drawdown DECIMAL(12,2) DEFAULT 0,
  volatility DECIMAL(12,6) DEFAULT 0,
  risk_adjusted_return DECIMAL(12,6) DEFAULT 0,
  consistency DECIMAL(5,4) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strategy_id)
);

-- Strategy Trades Table (detailed trade history per strategy)
CREATE TABLE IF NOT EXISTS strategy_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(18,8) NOT NULL,
  entry_price DECIMAL(18,8) NOT NULL,
  exit_price DECIMAL(18,8),
  pnl DECIMAL(12,2),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  exit_timestamp TIMESTAMPTZ,
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_strategy_performance_user_id ON strategy_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_performance_strategy_id ON strategy_performance(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_performance_active ON strategy_performance(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_strategy_trades_user_id ON strategy_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_trades_strategy_id ON strategy_trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_trades_symbol ON strategy_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_strategy_trades_timestamp ON strategy_trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_strategy_trades_open ON strategy_trades(is_open) WHERE is_open = TRUE;

-- Enable Row Level Security
ALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategy_performance
DROP POLICY IF EXISTS "Users can view their own strategy performance" ON strategy_performance;
CREATE POLICY "Users can view their own strategy performance"
  ON strategy_performance FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own strategy performance" ON strategy_performance;
CREATE POLICY "Users can insert their own strategy performance"
  ON strategy_performance FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own strategy performance" ON strategy_performance;
CREATE POLICY "Users can update their own strategy performance"
  ON strategy_performance FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for strategy_trades
DROP POLICY IF EXISTS "Users can view their own strategy trades" ON strategy_trades;
CREATE POLICY "Users can view their own strategy trades"
  ON strategy_trades FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own strategy trades" ON strategy_trades;
CREATE POLICY "Users can insert their own strategy trades"
  ON strategy_trades FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own strategy trades" ON strategy_trades;
CREATE POLICY "Users can update their own strategy trades"
  ON strategy_trades FOR UPDATE
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_strategy_performance_updated_at ON strategy_performance;
CREATE TRIGGER update_strategy_performance_updated_at
  BEFORE UPDATE ON strategy_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_strategy_trades_updated_at ON strategy_trades;
CREATE TRIGGER update_strategy_trades_updated_at
  BEFORE UPDATE ON strategy_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON strategy_performance TO authenticated;
GRANT ALL ON strategy_trades TO authenticated;
GRANT ALL ON strategy_performance TO anon;
GRANT ALL ON strategy_trades TO anon;

-- Insert initial strategy records for all users (optional, for demo purposes)
INSERT INTO strategy_performance (user_id, strategy_id, strategy_name, is_active)
VALUES
  ('bcc6fb8b-b62c-4d28-a976-fe49614e146d', 'rsi', 'RSI Momentum', TRUE),
  ('bcc6fb8b-b62c-4d28-a976-fe49614e146d', 'macd', 'MACD Trend Following', TRUE),
  ('bcc6fb8b-b62c-4d28-a976-fe49614e146d', 'bollinger', 'Bollinger Bands', TRUE),
  ('bcc6fb8b-b62c-4d28-a976-fe49614e146d', 'ma_crossover', 'MA Crossover', TRUE),
  ('bcc6fb8b-b62c-4d28-a976-fe49614e146d', 'mean_reversion', 'Mean Reversion', TRUE)
ON CONFLICT (user_id, strategy_id) DO NOTHING;
