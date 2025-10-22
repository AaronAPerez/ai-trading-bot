-- Fix RLS Policies for AI Trading Bot
-- This allows the system user (00000000-0000-0000-0000-000000000000) to write to tables
-- Run this in your Supabase SQL Editor if you want to enable database logging

-- Option 1: Disable RLS temporarily (NOT RECOMMENDED for production)
-- ALTER TABLE trading_strategies DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_learning_data DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_activity_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_metrics DISABLE ROW LEVEL SECURITY;

-- Option 2: Add policy to allow system user writes (RECOMMENDED)
-- Note: user_id is stored as TEXT in the database, not UUID

-- Allow system user to insert/update trading_strategies
CREATE POLICY "Allow system user to manage strategies"
ON trading_strategies
FOR ALL
USING (user_id = '00000000-0000-0000-0000-000000000000')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Allow system user to insert ai_learning_data
CREATE POLICY "Allow system user to log learning data"
ON ai_learning_data
FOR INSERT
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Allow system user to insert bot_activity_logs
CREATE POLICY "Allow system user to log activities"
ON bot_activity_logs
FOR INSERT
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Allow system user to insert/update bot_metrics
CREATE POLICY "Allow system user to update metrics"
ON bot_metrics
FOR ALL
USING (user_id = '00000000-0000-0000-0000-000000000000')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Option 3: Allow authenticated users (if you want normal user auth to work)
-- CREATE POLICY "Allow authenticated users" ON trading_strategies FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Allow authenticated users" ON ai_learning_data FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Allow authenticated users" ON bot_activity_logs FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Allow authenticated users" ON bot_metrics FOR ALL USING (auth.uid() = user_id);

-- Verify policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('trading_strategies', 'ai_learning_data', 'bot_activity_logs', 'bot_metrics');
