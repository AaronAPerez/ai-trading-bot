-- Fix Supabase security issues
-- 1. Ensure ALL views use SECURITY INVOKER (default, safer than SECURITY DEFINER)
-- 2. Enable RLS on strategy_status table

-- =====================================================
-- FIX 1: Recreate ALL views with explicit SECURITY INVOKER
-- =====================================================

-- 1.1 bot_win_rate_summary
DROP VIEW IF EXISTS public.bot_win_rate_summary CASCADE;

CREATE OR REPLACE VIEW public.bot_win_rate_summary
WITH (security_invoker = true) AS
SELECT
  user_id,
  COUNT(*) AS total_trades,
  COUNT(*) FILTER (WHERE pnl > 0) AS winning_trades,
  COUNT(*) FILTER (WHERE pnl <= 0) AS losing_trades,
  ROUND(COUNT(*) FILTER (WHERE pnl > 0)::decimal / NULLIF(COUNT(*), 0), 4) AS win_rate,
  ROUND(SUM(pnl)::numeric, 2) AS total_pnl,
  ROUND(AVG(pnl)::numeric, 4) AS avg_return
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id;

COMMENT ON VIEW public.bot_win_rate_summary IS 'Bot win rate summary with SECURITY INVOKER';

-- 1.2 bot_drawdown_tracker
DROP VIEW IF EXISTS public.bot_drawdown_tracker CASCADE;

CREATE OR REPLACE VIEW public.bot_drawdown_tracker
WITH (security_invoker = true) AS
SELECT
  user_id,
  symbol,
  MAX(pnl) AS peak_pnl,
  MIN(pnl) AS trough_pnl,
  ROUND((MAX(pnl) - MIN(pnl))::numeric, 2) AS drawdown,
  ROUND((MIN(pnl)::decimal / NULLIF(MAX(pnl), 0)), 4) AS drawdown_ratio
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id, symbol;

COMMENT ON VIEW public.bot_drawdown_tracker IS 'Bot drawdown tracker with SECURITY INVOKER';

-- 1.3 strategy_performance_summary
DROP VIEW IF EXISTS public.strategy_performance_summary CASCADE;

CREATE OR REPLACE VIEW public.strategy_performance_summary
WITH (security_invoker = true) AS
SELECT
  user_id,
  strategy,
  COUNT(*) AS trades,
  ROUND(AVG(pnl)::numeric, 4) AS avg_pnl,
  ROUND(SUM(pnl)::numeric, 2) AS total_pnl,
  ROUND(COUNT(*) FILTER (WHERE pnl > 0)::decimal / NULLIF(COUNT(*), 0), 4) AS win_rate
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id, strategy;

COMMENT ON VIEW public.strategy_performance_summary IS 'Strategy performance summary with SECURITY INVOKER';

-- =====================================================
-- FIX 2: Enable RLS on strategy_status table (if it exists)
-- =====================================================

-- Check if strategy_status table exists, if so, enable RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'strategy_status'
  ) THEN
    -- Enable RLS
    ALTER TABLE public.strategy_status ENABLE ROW LEVEL SECURITY;

    -- Create policies for public access (adjust as needed for your security requirements)

    -- Allow public read access
    DROP POLICY IF EXISTS "Allow public read access" ON public.strategy_status;
    CREATE POLICY "Allow public read access" ON public.strategy_status
      FOR SELECT USING (true);

    -- Allow public insert access
    DROP POLICY IF EXISTS "Allow public insert access" ON public.strategy_status;
    CREATE POLICY "Allow public insert access" ON public.strategy_status
      FOR INSERT WITH CHECK (true);

    -- Allow public update access
    DROP POLICY IF EXISTS "Allow public update access" ON public.strategy_status;
    CREATE POLICY "Allow public update access" ON public.strategy_status
      FOR UPDATE USING (true);

    -- Allow public delete access
    DROP POLICY IF EXISTS "Allow public delete access" ON public.strategy_status;
    CREATE POLICY "Allow public delete access" ON public.strategy_status
      FOR DELETE USING (true);

    RAISE NOTICE 'RLS enabled on strategy_status table';
  ELSE
    RAISE NOTICE 'strategy_status table does not exist, skipping RLS setup';
  END IF;
END $$;

-- =====================================================
-- FIX 3: Ensure other views also use SECURITY INVOKER
-- =====================================================

-- Drop and recreate position_metrics with SECURITY INVOKER
DROP VIEW IF EXISTS public.position_metrics;

CREATE OR REPLACE VIEW public.position_metrics
WITH (security_invoker = true) AS
SELECT
  user_id,
  symbol,
  COUNT(*) AS trades,
  ROUND(SUM(pnl)::numeric, 2) AS total_pnl,
  ROUND(AVG(pnl)::numeric, 4) AS avg_pnl,
  ROUND((MAX(pnl) - MIN(pnl))::numeric, 2) AS drawdown,
  ROUND((MIN(pnl)::decimal / NULLIF(MAX(pnl), 0)), 4) AS drawdown_ratio
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id, symbol;

-- Drop and recreate execution_quality_metrics with SECURITY INVOKER
DROP VIEW IF EXISTS public.execution_quality_metrics;

CREATE OR REPLACE VIEW public.execution_quality_metrics
WITH (security_invoker = true) AS
SELECT
  user_id,
  symbol,
  ROUND(AVG(price)::numeric, 4) AS avg_fill_price,
  ROUND(AVG(ai_confidence)::numeric, 4) AS avg_confidence,
  ROUND(AVG(fees)::numeric, 4) AS avg_fees,
  ROUND(AVG(pnl)::numeric, 4) AS avg_pnl,
  COUNT(*) AS trades
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id, symbol;

-- Add comments
COMMENT ON VIEW public.position_metrics IS 'Position performance metrics with SECURITY INVOKER';
COMMENT ON VIEW public.execution_quality_metrics IS 'Trade execution quality metrics with SECURITY INVOKER';
