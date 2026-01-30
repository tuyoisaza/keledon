-- Migration: Add user_id to sessions table
-- Run this in Supabase SQL Editor

-- Add user_id column to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions';
