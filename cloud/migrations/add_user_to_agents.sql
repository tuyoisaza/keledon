-- Add user_id to agents table to link agents to specific users (e.g. Human in the Loop)
ALTER TABLE agents 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_agents_user_id ON agents(user_id);
