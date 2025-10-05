-- ============================================
-- Supabase Free Tier Optimization (500 MB limit)
-- ============================================
-- This migration adds automatic cleanup, retention policies,
-- and optimizations to stay within free tier limits

-- ============================================
-- 1. Add created_at index for efficient cleanup queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trade_history_created_at ON trade_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_activity_logs_created_at ON bot_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_created_at ON ai_learning_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_created_at ON market_sentiment(created_at DESC);

-- ============================================
-- 2. Function to clean old trade history (keep last 90 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_trade_history()
RETURNS void AS $$
BEGIN
  DELETE FROM trade_history
  WHERE created_at < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Cleaned up trade_history older than 90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Function to clean old activity logs (keep last 30 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM bot_activity_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  RAISE NOTICE 'Cleaned up bot_activity_logs older than 30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Function to clean old AI learning data (keep last 60 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_ai_learning_data()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_learning_data
  WHERE created_at < NOW() - INTERVAL '60 days';

  RAISE NOTICE 'Cleaned up ai_learning_data older than 60 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Function to clean old market sentiment (keep last 7 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_market_sentiment()
RETURNS void AS $$
BEGIN
  DELETE FROM market_sentiment
  WHERE created_at < NOW() - INTERVAL '7 days';

  RAISE NOTICE 'Cleaned up market_sentiment older than 7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Master cleanup function (run all cleanups)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_all_old_data()
RETURNS TABLE(
  cleanup_type TEXT,
  status TEXT,
  message TEXT
) AS $$
BEGIN
  -- Clean trade history
  BEGIN
    PERFORM cleanup_old_trade_history();
    RETURN QUERY SELECT 'trade_history'::TEXT, 'success'::TEXT, 'Cleaned records older than 90 days'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'trade_history'::TEXT, 'error'::TEXT, SQLERRM::TEXT;
  END;

  -- Clean activity logs
  BEGIN
    PERFORM cleanup_old_activity_logs();
    RETURN QUERY SELECT 'bot_activity_logs'::TEXT, 'success'::TEXT, 'Cleaned records older than 30 days'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'bot_activity_logs'::TEXT, 'error'::TEXT, SQLERRM::TEXT;
  END;

  -- Clean AI learning data
  BEGIN
    PERFORM cleanup_old_ai_learning_data();
    RETURN QUERY SELECT 'ai_learning_data'::TEXT, 'success'::TEXT, 'Cleaned records older than 60 days'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'ai_learning_data'::TEXT, 'error'::TEXT, SQLERRM::TEXT;
  END;

  -- Clean market sentiment
  BEGIN
    PERFORM cleanup_old_market_sentiment();
    RETURN QUERY SELECT 'market_sentiment'::TEXT, 'success'::TEXT, 'Cleaned records older than 7 days'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'market_sentiment'::TEXT, 'error'::TEXT, SQLERRM::TEXT;
  END;

  -- Vacuum to reclaim space
  BEGIN
    VACUUM ANALYZE trade_history;
    VACUUM ANALYZE bot_activity_logs;
    VACUUM ANALYZE ai_learning_data;
    VACUUM ANALYZE market_sentiment;
    RETURN QUERY SELECT 'vacuum'::TEXT, 'success'::TEXT, 'Vacuumed all tables to reclaim space'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'vacuum'::TEXT, 'error'::TEXT, SQLERRM::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Function to get database size statistics
-- ============================================

CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  table_size TEXT,
  indexes_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT,
    c.reltuples::BIGINT,
    pg_size_pretty(pg_total_relation_size(c.oid))::TEXT,
    pg_size_pretty(pg_relation_size(c.oid))::TEXT,
    pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid))::TEXT
  FROM pg_class c
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN ('trade_history', 'bot_activity_logs', 'ai_learning_data', 'market_sentiment', 'bot_metrics', 'profiles')
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Optimize TEXT columns to save space
-- ============================================

-- Convert large TEXT columns to VARCHAR with reasonable limits
ALTER TABLE bot_activity_logs
  ALTER COLUMN message TYPE VARCHAR(500),
  ALTER COLUMN details TYPE VARCHAR(2000);

ALTER TABLE ai_learning_data
  ALTER COLUMN strategy_used TYPE VARCHAR(100);

ALTER TABLE market_sentiment
  ALTER COLUMN sentiment_label TYPE VARCHAR(20),
  ALTER COLUMN source TYPE VARCHAR(50);

-- ============================================
-- 9. Create partitioning for large tables (optional)
-- ============================================

-- Note: Partitioning is commented out as it requires table recreation
-- Uncomment and modify if needed for production with large datasets

-- CREATE TABLE trade_history_partitioned (
--   LIKE trade_history INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);

-- CREATE TABLE trade_history_2025_01 PARTITION OF trade_history_partitioned
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================
-- 10. Grant execute permissions to service role
-- ============================================

GRANT EXECUTE ON FUNCTION cleanup_old_trade_history() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_activity_logs() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_ai_learning_data() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_market_sentiment() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_all_old_data() TO service_role;
GRANT EXECUTE ON FUNCTION get_database_stats() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_all_old_data() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_stats() TO authenticated;

-- ============================================
-- 11. Create a cron job placeholder
-- ============================================

-- Note: You'll need to set up pg_cron extension or use Supabase Edge Functions
-- to schedule automatic cleanup. Add this in Supabase Dashboard:
--
-- SELECT cron.schedule(
--   'cleanup-old-data',
--   '0 2 * * *',  -- Daily at 2 AM
--   $$ SELECT cleanup_all_old_data(); $$
-- );

-- ============================================
-- 12. Initial cleanup (run once)
-- ============================================

-- Run initial cleanup to free up space immediately
SELECT cleanup_all_old_data();

-- Show current database statistics
SELECT * FROM get_database_stats();
