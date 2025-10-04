-- Add confidence_level column to ai_learning_data table if it doesn't exist
ALTER TABLE ai_learning_data
ADD COLUMN IF NOT EXISTS confidence_level DOUBLE PRECISION DEFAULT 0.0;

-- Update existing rows to have a default confidence level
UPDATE ai_learning_data
SET confidence_level = 0.75
WHERE confidence_level IS NULL;
