-- ==================================================================
-- FIX trading_strategies Table Schema
-- Run this in Supabase SQL Editor
-- ==================================================================

-- Step 1: Check current schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trading_strategies'
ORDER BY ordinal_position;

-- Step 2: Add missing columns
ALTER TABLE trading_strategies
ADD COLUMN IF NOT EXISTS total_signals INTEGER DEFAULT 0;

-- Step 3: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 4: Verify the fix
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trading_strategies'
AND column_name IN ('total_signals', 'successful_signals', 'name', 'strategy_type')
ORDER BY column_name;

-- Expected output:
-- name | text
-- strategy_type | text
-- successful_signals | integer
-- total_signals | integer

SELECT 'SUCCESS: trading_strategies table is now fixed!' AS status;
