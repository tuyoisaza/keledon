-- Users Table Migration for Keldon
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- ========================================
-- USERS (Human operators who configure Agents)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    is_online BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- MODIFY AGENTS (Add user link and stats)
-- ========================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS calls_handled INT DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS fcr_rate FLOAT DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS avg_handle_time INT DEFAULT 0;

-- ========================================
-- INDEXES for performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active) WHERE is_active = true;

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop old policy if exists
DROP POLICY IF EXISTS "Allow all for users" ON users;

-- Development policy (replace with proper auth for production)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- SEED DATA (Sample Users)
-- ========================================
INSERT INTO users (email, name, role, is_online) VALUES 
    ('admin@keledon.ai', 'System Admin', 'superadmin', false),
    ('john.doe@acme.com', 'John Doe', 'admin', false),
    ('jane.smith@acme.com', 'Jane Smith', 'user', false)
ON CONFLICT (email) DO NOTHING;

-- Verification
SELECT 'Users table created successfully!' as message;
SELECT COUNT(*) as user_count FROM users;
