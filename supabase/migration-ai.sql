-- Add AI analysis columns to emails table
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ai_category text;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ai_tags text[];
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ai_sentiment text;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ai_processed_at timestamptz;
