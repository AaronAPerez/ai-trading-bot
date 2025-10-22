-- ==================================================================
-- COMPLETE FIX FOR trading_strategies TABLE
-- Run this in Supabase SQL Editor to fix all schema issues
-- ==================================================================

-- Step 1: Check current columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'trading_strategies'
ORDER BY ordinal_position;

-- Step 2: Add missing column (total_signals)
ALTER TABLE trading_strategies
ADD COLUMN IF NOT EXISTS total_signals INTEGER DEFAULT 0;

-- Step 3: Ensure strategy_name column exists and is NOT NULL
-- (Your database already has this, but let's make sure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies'
    AND column_name = 'strategy_name'
  ) THEN
    -- If strategy_name doesn't exist but 'name' does, rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'trading_strategies'
      AND column_name = 'name'
    ) THEN
      ALTER TABLE trading_strategies
      RENAME COLUMN name TO strategy_name;
    ELSE
      -- Create strategy_name column
      ALTER TABLE trading_strategies
      ADD COLUMN strategy_name TEXT NOT NULL DEFAULT 'Unnamed Strategy';

      ALTER TABLE trading_strategies
      ALTER COLUMN strategy_name DROP DEFAULT;
    END IF;
  END IF;
END $$;

-- Step 4: Ensure all required columns exist
ALTER TABLE trading_strategies
ADD COLUMN IF NOT EXISTS successful_signals INTEGER DEFAULT 0;

ALTER TABLE trading_strategies
ADD COLUMN IF NOT EXISTS total_return NUMERIC DEFAULT 0;

ALTER TABLE trading_strategies
ADD COLUMN IF NOT EXISTS win_rate NUMERIC DEFAULT 0;

-- Step 5: Add unique constraint if it doesn't exist
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

-- Step 6: Update RLS policies to allow system user writes
-- Drop old policies
DROP POLICY IF EXISTS "Allow system user writes" ON trading_strategies;
DROP POLICY IF EXISTS "Users can insert own strategies" ON trading_strategies;
DROP POLICY IF EXISTS "Users can update own strategies" ON trading_strategies;
DROP POLICY IF EXISTS "Users can view own strategies" ON trading_strategies;

-- Create new policies
CREATE POLICY "Users can view own strategies"
ON trading_strategies FOR SELECT
USING (
  user_id = auth.uid() OR
  user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE POLICY "Users can insert own strategies"
ON trading_strategies FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE POLICY "Users can update own strategies"
ON trading_strategies FOR UPDATE
USING (
  user_id = auth.uid() OR
  user_id = '00000000-0000-0000-0000-000000000000'::uuid
)
WITH CHECK (
  user_id = auth.uid() OR
  user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

-- Step 7: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 8: Verify the fix
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'trading_strategies'
AND column_name IN (
  'strategy_name',
  'strategy_type',
  'total_signals',
  'successful_signals',
  'total_return',
  'win_rate'
)
ORDER BY column_name;

-- Expected output:
-- strategy_name       | text    | NO
-- strategy_type       | text    | NO
-- successful_signals  | integer | YES
-- total_return        | numeric | YES
-- total_signals       | integer | YES
-- win_rate            | numeric | YES

SELECT '✅ SUCCESS: trading_strategies table is now fixed!' AS status;
