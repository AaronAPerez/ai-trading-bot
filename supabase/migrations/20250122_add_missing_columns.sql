-- Add missing columns to trading_strategies table
-- Date: 2025-01-22
-- Description: Ensures total_signals column exists

-- Add total_signals column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies'
    AND column_name = 'total_signals'
  ) THEN
    ALTER TABLE trading_strategies
    ADD COLUMN total_signals INTEGER DEFAULT 0;

    RAISE NOTICE 'Added total_signals column';
  ELSE
    RAISE NOTICE 'total_signals column already exists';
  END IF;
END $$;

-- Add successful_signals column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies'
    AND column_name = 'successful_signals'
  ) THEN
    ALTER TABLE trading_strategies
    ADD COLUMN successful_signals INTEGER DEFAULT 0;

    RAISE NOTICE 'Added successful_signals column';
  ELSE
    RAISE NOTICE 'successful_signals column already exists';
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify columns exist
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'trading_strategies'
AND column_name IN ('total_signals', 'successful_signals', 'name', 'strategy_type')
ORDER BY column_name;
