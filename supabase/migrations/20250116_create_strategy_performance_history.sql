-- Create strategy_performance_history table to track historical snapshots
-- This preserves all performance data over time instead of overwriting

CREATE TABLE IF NOT EXISTS strategy_performance_history (
  id BIGSERIAL PRIMARY KEY,
  strategy_id TEXT NOT NULL,
  strategy_name TEXT NOT NULL,

  -- Trade statistics at this snapshot
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

  -- Snapshot timestamp
  snapshot_time TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_strategy_perf_history_strategy_id ON strategy_performance_history(strategy_id);
CREATE INDEX idx_strategy_perf_history_snapshot_time ON strategy_performance_history(snapshot_time DESC);
CREATE INDEX idx_strategy_perf_history_strategy_snapshot ON strategy_performance_history(strategy_id, snapshot_time DESC);

-- Enable Row Level Security
ALTER TABLE strategy_performance_history ENABLE ROW LEVEL SECURITY;

-- Policies for public access
CREATE POLICY "Allow public read access" ON strategy_performance_history
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON strategy_performance_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON strategy_performance_history
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON strategy_performance_history
  FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE strategy_performance_history IS 'Historical snapshots of AI Trading Bot strategy performance metrics for trend analysis and auditing';
