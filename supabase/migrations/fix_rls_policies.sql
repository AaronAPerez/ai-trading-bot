-- Fix RLS Policies for AI Trading Bot
-- This migration ensures all tables have proper RLS policies that allow:
-- 1. Users to access their own data
-- 2. Service role to bypass RLS for API operations

-- ============================================
-- bot_metrics table
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own bot_metrics" ON bot_metrics;
DROP POLICY IF EXISTS "Users can insert own bot_metrics" ON bot_metrics;
DROP POLICY IF EXISTS "Users can update own bot_metrics" ON bot_metrics;
DROP POLICY IF EXISTS "Service role has full access to bot_metrics" ON bot_metrics;

-- Recreate policies with correct permissions
CREATE POLICY "Users can read own bot_metrics"
ON bot_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot_metrics"
ON bot_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot_metrics"
ON bot_metrics FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- IMPORTANT: Service role bypass (for API routes)
CREATE POLICY "Service role bypass for bot_metrics"
ON bot_metrics FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- bot_activity_logs table
-- ============================================

DROP POLICY IF EXISTS "Users can view own logs" ON bot_activity_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON bot_activity_logs;
DROP POLICY IF EXISTS "Service role bypass for bot_activity_logs" ON bot_activity_logs;

CREATE POLICY "Users can view own logs"
ON bot_activity_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
ON bot_activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass for bot_activity_logs"
ON bot_activity_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- ai_learning_data table
-- ============================================

DROP POLICY IF EXISTS "Users can view own learning data" ON ai_learning_data;
DROP POLICY IF EXISTS "Users can insert own learning data" ON ai_learning_data;
DROP POLICY IF EXISTS "Service role bypass for ai_learning_data" ON ai_learning_data;

CREATE POLICY "Users can view own learning data"
ON ai_learning_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning data"
ON ai_learning_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass for ai_learning_data"
ON ai_learning_data FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- trade_history table
-- ============================================

DROP POLICY IF EXISTS "Users can view own trades" ON trade_history;
DROP POLICY IF EXISTS "Users can insert own trades" ON trade_history;
DROP POLICY IF EXISTS "Service role bypass for trade_history" ON trade_history;

CREATE POLICY "Users can view own trades"
ON trade_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
ON trade_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass for trade_history"
ON trade_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- Verify RLS is enabled on all tables
-- ============================================

ALTER TABLE bot_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_sentiment ENABLE ROW LEVEL SECURITY;

-- Note: profiles table policies (keep existing)
DROP POLICY IF EXISTS "Service role bypass for profiles" ON profiles;

CREATE POLICY "Service role bypass for profiles"
ON profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
