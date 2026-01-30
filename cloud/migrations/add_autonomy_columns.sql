-- Add Autonomy columns to Agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS autonomy_level INT DEFAULT 1 CHECK (autonomy_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS policies JSONB DEFAULT '{}';

-- Optional: Add to Companies for global defaults if needed
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS default_autonomy_level INT DEFAULT 1;
