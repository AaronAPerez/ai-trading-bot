-- Fix Schema Mismatches
-- Date: 2025-01-21
-- Description: Fixes column mismatches and constraint errors

-- ============================================
-- 1. Fix ai_learning_data outcome constraint
-- ============================================

-- Drop the old constraint
ALTER TABLE ai_learning_data
DROP CONSTRAINT IF EXISTS ai_learning_data_outcome_check;

-- Add new constraint with correct values
-- Code uses: 'WIN', 'LOSS', 'NEUTRAL'
-- Old constraint used: 'profit', 'loss', 'breakeven'
ALTER TABLE ai_learning_data
ADD CONSTRAINT ai_learning_data_outcome_check
CHECK (outcome IN ('WIN', 'LOSS', 'NEUTRAL'));

-- ============================================
-- 2. Fix trading_strategies table
-- ============================================

-- The table already has a 'name' column in database.types.ts (line 1156)
-- But verify it exists and create if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies'
    AND column_name = 'name'
  ) THEN
    ALTER TABLE trading_strategies
    ADD COLUMN name TEXT NOT NULL DEFAULT 'Unnamed Strategy';

    -- Remove default after adding the column
    ALTER TABLE trading_strategies
    ALTER COLUMN name DROP DEFAULT;
  END IF;
END $$;

-- Fix column name mismatch: successful_signals vs successful_trades
-- Code uses 'successful_signals' but database.types.ts shows 'successful_signals' exists
-- Verify the column name and add alias if needed
DO $$
BEGIN
  -- Check if successful_trades exists but successful_signals doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies'
    AND column_name = 'successful_trades'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies'
    AND column_name = 'successful_signals'
  ) THEN
    -- Rename successful_trades to successful_signals
    ALTER TABLE trading_strategies
    RENAME COLUMN successful_trades TO successful_signals;
  END IF;

  -- If neither exists, create successful_signals
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies'
    AND column_name = 'successful_signals'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies'
    AND column_name = 'successful_trades'
  ) THEN
    ALTER TABLE trading_strategies
    ADD COLUMN successful_signals INTEGER DEFAULT 0;
  END IF;
END $$;

-- Ensure the unique constraint on user_id + strategy_type exists
-- This is needed for the upsert in StrategyDatabaseIntegration.ts:92
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trading_strategies_user_id_strategy_type_key'
  ) THEN
    ALTER TABLE trading_strategies
    ADD CONSTRAINT trading_strategies_user_id_strategy_type_key
    UNIQUE (user_id, strategy_type);
  END IF;
END $$;

-- ============================================
-- 3. Update existing data (if needed)
-- ============================================

-- Update any existing rows that might have old outcome values
UPDATE ai_learning_data
SET outcome = CASE
  WHEN outcome = 'profit' THEN 'WIN'
  WHEN outcome = 'loss' THEN 'LOSS'
  WHEN outcome = 'breakeven' THEN 'NEUTRAL'
  ELSE outcome
END
WHERE outcome IN ('profit', 'loss', 'breakeven');

-- ============================================
-- 4. Add helpful indexes
-- ============================================

-- Index for faster lookups on outcome
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_outcome
ON ai_learning_data(outcome);

-- Index for strategy performance queries
CREATE INDEX IF NOT EXISTS idx_trading_strategies_user_strategy
ON trading_strategies(user_id, strategy_type);

-- ============================================
-- 5. Comments for documentation
-- ============================================

COMMENT ON CONSTRAINT ai_learning_data_outcome_check ON ai_learning_data IS
'Valid outcomes: WIN (profit), LOSS (loss), NEUTRAL (breakeven)';

COMMENT ON COLUMN trading_strategies.name IS
'Human-readable strategy name displayed in UI';

COMMENT ON COLUMN trading_strategies.strategy_type IS
'Strategy identifier used in code (e.g., normal, inverse, hedge)';
