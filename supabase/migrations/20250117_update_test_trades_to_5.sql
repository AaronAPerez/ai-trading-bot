-- Update test_trades_required from 7 to 5 for faster strategy validation
-- This makes testing complete after 5 trades instead of 7

-- Update the default for new rows
ALTER TABLE strategy_performance
  ALTER COLUMN test_trades_required SET DEFAULT 5;

ALTER TABLE strategy_performance_history
  ALTER COLUMN test_trades_required SET DEFAULT 5;

-- Update existing rows that are still at 7
UPDATE strategy_performance
SET test_trades_required = 5
WHERE test_trades_required = 7;

-- Add comment
COMMENT ON COLUMN strategy_performance.test_trades_required
  IS 'Number of test trades required before strategy exits testing mode (reduced to 5 for faster validation)';
