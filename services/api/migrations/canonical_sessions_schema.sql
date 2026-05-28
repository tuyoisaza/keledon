-- Migration: Update sessions table to canonical model
-- Run this in Supabase SQL Editor

-- 1. Drop existing sessions table if it doesn't match canonical model
DROP TABLE IF EXISTS sessions CASCADE;

-- 2. Create canonical sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'error')),
    tab_url TEXT,
    tab_title TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create canonical events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('text_input', 'ui_result', 'system')),
    payload JSONB NOT NULL DEFAULT '{}',
    ts TIMESTAMPTZ NOT NULL,
    agent_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create canonical flows table
CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    steps JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create canonical flow_runs table
CREATE TABLE IF NOT EXISTS flow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    current_step_index INT DEFAULT 0
);

-- 6. Create canonical ui_executions table
CREATE TABLE IF NOT EXISTS ui_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    flow_run_id UUID REFERENCES flow_runs(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    action TEXT NOT NULL,
    selector TEXT NOT NULL,
    value TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_flow_runs_session_id ON flow_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_flow_runs_status ON flow_runs(status);
CREATE INDEX IF NOT EXISTS idx_ui_executions_session_id ON ui_executions(session_id);

-- 8. Enable RLS (Row Level Security)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_executions ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies (allow all for development, adjust for production)
CREATE POLICY "Allow all for sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for flows" ON flows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for flow_runs" ON flow_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for ui_executions" ON ui_executions FOR ALL USING (true) WITH CHECK (true);

-- 10. Verification queries
SELECT 'sessions' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
UNION ALL
SELECT 'events' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
UNION ALL
SELECT 'flow_runs' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'flow_runs'
ORDER BY table_name, ordinal_position;