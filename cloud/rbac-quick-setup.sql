-- Quick execution script to run RBAC setup
-- Run this first in Supabase SQL Editor

-- Check if base tables exist, if not create them
DO $$
BEGIN
    -- Check if companies table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'companies'
    ) THEN
        -- Companies table missing, create base schema
        EXECUTE 'CREATE TABLE companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            industry TEXT,
            agent_count INT DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )';
        
        -- Create other missing base tables
        EXECUTE 'CREATE TABLE brands (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )';
        
        EXECUTE 'CREATE TABLE teams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            member_count INT DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )';
        
        EXECUTE 'CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
            team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL DEFAULT ''user'',
            is_online BOOLEAN DEFAULT false,
            last_login TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )';
        
        EXECUTE 'CREATE TABLE agents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            email TEXT,
            role TEXT,
            is_active BOOLEAN DEFAULT true,
            calls_handled INT DEFAULT 0,
            fcr_rate FLOAT DEFAULT 0,
            avg_handle_time INT DEFAULT 0,
            autonomy_level INT DEFAULT 1,
            policies JSONB DEFAULT ''{}'',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )';
        
        EXECUTE 'CREATE TABLE sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            status TEXT DEFAULT ''idle'',
            start_time TIMESTAMPTZ DEFAULT NOW(),
            end_time TIMESTAMPTZ,
            duration_minutes INT,
            transcript TEXT,
            summary TEXT,
            metadata JSONB DEFAULT ''{}'',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )';
    END IF;
END $$;

-- Now run the main RBAC setup
-- (You'll need to run the main rbac-complete-setup.sql after this)
SELECT '🔧 Base schema verification complete. Now run the main RBAC setup.' as status;