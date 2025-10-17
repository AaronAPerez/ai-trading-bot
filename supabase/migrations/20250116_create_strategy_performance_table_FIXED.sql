-- Drop existing table if it exists (to start fresh)
DROP TABLE IF EXISTS strategy_performance CASCADE;

-- Create strategy_performance table with ALL required columns
CREATE TABLE strategy_performance (
  id BIGSERIAL PRIMARY KEY,
  strategy_id TEXT UNIQUE NOT NULL,
  strategy_name TEXT NOT NULL,

  -- Trade statistics
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_pnl DECIMAL(12, 2) DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  avg_pnl DECIMAL(12, 2) DEFAULT 0,

  -- Advanced metrics
  sharpe_ratio DECIMAL(8, 4) DEFAULT 0,
  max_drawdown DECIMAL(12, 2) DEFAULT 0,
  consecutive_losses INTEGER DEFAULT 0,
  consecutive_wins INTEGER DEFAULT 0,
  last_trade_time TIMESTAMP,

  -- Testing mode data
  testing_mode BOOLEAN DEFAULT TRUE,
  test_trades_completed INTEGER DEFAULT 0,
  test_trades_required INTEGER DEFAULT 7,
  test_pnl DECIMAL(12, 2) DEFAULT 0,
  test_win_rate DECIMAL(5, 2) DEFAULT 0,
  test_passed BOOLEAN,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_strategy_performance_strategy_id ON strategy_performance(strategy_id);
CREATE INDEX idx_strategy_performance_total_pnl ON strategy_performance(total_pnl DESC);

-- Enable Row Level Security
ALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY;

-- Policies for public access
CREATE POLICY "Allow public read access" ON strategy_performance
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON strategy_performance
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON strategy_performance
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON strategy_performance
  FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE strategy_performance IS 'Stores AI Trading Bot strategy performance metrics for adaptive strategy selection';
