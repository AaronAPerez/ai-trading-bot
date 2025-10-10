-- Create bot_configurations table
CREATE TABLE IF NOT EXISTS bot_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Strategy',
  mode TEXT NOT NULL DEFAULT 'paper',
  strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
  watchlist TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  execution_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_config UNIQUE(user_id, name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bot_configurations_user_id ON bot_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_configurations_is_active ON bot_configurations(is_active);

-- Enable RLS
ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own configurations"
  ON bot_configurations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configurations"
  ON bot_configurations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configurations"
  ON bot_configurations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own configurations"
  ON bot_configurations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bot_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_bot_configurations_updated_at
  BEFORE UPDATE ON bot_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_configurations_updated_at();
