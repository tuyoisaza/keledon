-- Create required tables for real session persistence
-- This replaces mock data with real database storage

-- User Sessions table (for session management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated'))
);

-- Agent Events table (for brain event persistence)
CREATE TABLE IF NOT EXISTS agent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('text_input', 'ui_result', 'system')),
    payload JSONB NOT NULL DEFAULT '{}',
    ts TIMESTAMPTZ DEFAULT NOW(),
    agent_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cloud Commands table (for command persistence)
CREATE TABLE IF NOT EXISTS cloud_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    command_id TEXT NOT NULL,
    command_type TEXT NOT NULL CHECK (command_type IN ('say', 'ui_steps', 'mode', 'stop', 'error')),
    confidence FLOAT NOT NULL DEFAULT 0.0,
    mode TEXT DEFAULT 'normal' CHECK (mode IN ('normal', 'safe', 'error')),
    flow_id UUID,
    flow_run_id UUID,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_events_session ON agent_events(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_cloud_commands_session ON cloud_commands(session_id);
CREATE INDEX IF NOT EXISTS idx_cloud_commands_type ON cloud_commands(command_type);

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_commands ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for development, tighten for production)
DROP POLICY IF EXISTS "Allow all user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Allow all agent_events" ON agent_events;
DROP POLICY IF EXISTS "Allow all cloud_commands" ON cloud_commands;

CREATE POLICY "Allow all user_sessions" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all agent_events" ON agent_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all cloud_commands" ON cloud_commands FOR ALL USING (true) WITH CHECK (true);

-- Verification
SELECT 'Real session persistence tables created successfully!' as message;