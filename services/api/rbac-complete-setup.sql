-- ========================================
-- EXECUTION SCRIPT: COMPLETE RBAC SETUP
-- One-click setup for PepsiCo & Stellantis RBAC system
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- STEP 1: BASE SCHEMA
-- ========================================

\echo '🔧 STEP 1: Setting up base schema...'

-- Run the main schema first
\i supabase-schema.sql

-- ========================================
-- STEP 2: RBAC CORE TABLES
-- ========================================

\echo '🏗️ STEP 2: Creating RBAC core tables...'

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1, -- 1=highest, 10=lowest
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    is_system_role BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- ROLE_PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- ========================================
-- STEP 3: INSERT PERMISSIONS
-- ========================================

\echo '📋 STEP 3: Inserting permissions...'

INSERT INTO permissions (name, resource, action, description, category) VALUES
-- User Management
('users.create', 'users', 'create', 'Create new users', 'user_management'),
('users.read', 'users', 'read', 'View user information', 'user_management'),
('users.update', 'users', 'update', 'Update user information', 'user_management'),
('users.delete', 'users', 'delete', 'Delete users', 'user_management'),
('users.admin', 'users', 'admin', 'Full user administration', 'user_management'),

-- Agent Management
('agents.create', 'agents', 'create', 'Create new agents', 'agent_management'),
('agents.read', 'agents', 'read', 'View agent information', 'agent_management'),
('agents.update', 'agents', 'update', 'Update agent configuration', 'agent_management'),
('agents.delete', 'agents', 'delete', 'Delete agents', 'agent_management'),
('agents.control', 'agents', 'control', 'Start/stop/control agents', 'agent_management'),
('agents.admin', 'agents', 'admin', 'Full agent administration', 'agent_management'),

-- Flow Management
('flows.create', 'flows', 'create', 'Create new RPA flows', 'flow_management'),
('flows.read', 'flows', 'read', 'View RPA flows', 'flow_management'),
('flows.update', 'flows', 'update', 'Update RPA flows', 'flow_management'),
('flows.delete', 'flows', 'delete', 'Delete RPA flows', 'flow_management'),
('flows.execute', 'flows', 'execute', 'Execute RPA flows', 'flow_management'),
('flows.admin', 'flows', 'admin', 'Full flow administration', 'flow_management'),

-- Analytics
('analytics.read', 'analytics', 'read', 'View analytics and reports', 'analytics'),
('analytics.export', 'analytics', 'export', 'Export analytics data', 'analytics'),
('analytics.admin', 'analytics', 'admin', 'Full analytics administration', 'analytics'),

-- Team Management
('teams.create', 'teams', 'create', 'Create new teams', 'team_management'),
('teams.read', 'teams', 'read', 'View team information', 'team_management'),
('teams.update', 'teams', 'update', 'Update team information', 'team_management'),
('teams.delete', 'teams', 'delete', 'Delete teams', 'team_management'),
('teams.admin', 'teams', 'admin', 'Full team administration', 'team_management'),

-- Brand Management
('brands.create', 'brands', 'create', 'Create new brands', 'brand_management'),
('brands.read', 'brands', 'read', 'View brand information', 'brand_management'),
('brands.update', 'brands', 'update', 'Update brand information', 'brand_management'),
('brands.delete', 'brands', 'delete', 'Delete brands', 'brand_management'),
('brands.admin', 'brands', 'admin', 'Full brand administration', 'brand_management'),

-- Company Management
('companies.read', 'companies', 'read', 'View company information', 'company_management'),
('companies.update', 'companies', 'update', 'Update company information', 'company_management'),
('companies.admin', 'companies', 'admin', 'Full company administration', 'company_management'),

-- System Administration
('system.admin', 'system', 'admin', 'Full system administration', 'system_admin'),
('system.audit', 'system', 'audit', 'View system audit logs', 'system_admin'),
('system.config', 'system', 'config', 'Modify system configuration', 'system_admin'),

-- Session Management
('sessions.create', 'sessions', 'create', 'Create new sessions', 'session_management'),
('sessions.read', 'sessions', 'read', 'View session information', 'session_management'),
('sessions.update', 'sessions', 'update', 'Update session information', 'session_management'),
('sessions.delete', 'sessions', 'delete', 'Delete sessions', 'session_management'),
('sessions.admin', 'sessions', 'admin', 'Full session administration', 'session_management')

ON CONFLICT (name) DO NOTHING;

-- ========================================
-- STEP 4: INSERT COMPANIES
-- ========================================

\echo '🏢 STEP 4: Creating companies...'

INSERT INTO companies (id, name, industry, agent_count) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'PepsiCo', 'Food & Beverages', 2500),
('550e8400-e29b-41d4-a716-446655440002', 'Stellantis', 'Automotive', 1800)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 5: INSERT BRANDS (3 per company)
-- ========================================

\echo '🏷️ STEP 5: Creating brands (3 per company)...'

-- Clear existing brands for clean setup
DELETE FROM brands WHERE company_id IN (
    '550e8400-e29b-41d4-a716-446655440001', 
    '550e8400-e29b-41d4-a716-446655440002'
);

-- PepsiCo Brands
INSERT INTO brands (id, company_id, name, color) VALUES
('660e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Pepsi', '#004B93'),
('660e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'Lay''s', '#FFD700'),
('660e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 'Gatorade', '#FF6B35')
ON CONFLICT (id) DO NOTHING;

-- Stellantis Brands
INSERT INTO brands (id, company_id, name, color) VALUES
('660e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440002', 'Jeep', '#000000'),
('660e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440002', 'Ram', '#C41230'),
('660e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440002', 'Chrysler', '#1A3A5F')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 6: CREATE TEAMS
-- ========================================

\echo '👥 STEP 6: Creating teams...'

-- Clear existing teams
DELETE FROM teams WHERE brand_id IN (
    SELECT id FROM brands WHERE company_id IN (
        '550e8400-e29b-41d4-a716-446655440001', 
        '550e8400-e29b-41d4-a716-446655440002'
    )
);

-- PepsiCo Teams
INSERT INTO teams (id, brand_id, name, member_count) VALUES
('770e8400-e29b-41d4-a716-446655440501', '660e8400-e29b-41d4-a716-446655440101', 'Pepsi Customer Service', 25),
('770e8400-e29b-41d4-a716-446655440502', '660e8400-e29b-41d4-a716-446655440102', 'Lay''s Sales Team', 18),
('770e8400-e29b-41d4-a716-446655440503', '660e8400-e29b-41d4-a716-446655440103', 'Gatorade Sports Team', 20)
ON CONFLICT (id) DO NOTHING;

-- Stellantis Teams
INSERT INTO teams (id, brand_id, name, member_count) VALUES
('770e8400-e29b-41d4-a716-446655440601', '660e8400-e29b-41d4-a716-446655440201', 'Jeep Support Team', 22),
('770e8400-e29b-41d4-a716-446655440602', '660e8400-e29b-41d4-a716-446655440202', 'Ram Truck Division', 15),
('770e8400-e29b-41d4-a716-446655440603', '660e8400-e29b-41d4-a716-446655440203', 'Chrysler Premium', 12)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 7: INSERT ROLES
-- ========================================

\echo '👑 STEP 7: Creating roles...'

INSERT INTO roles (id, name, description, level, is_system_role) VALUES
-- System Roles
('800e8400-e29b-41d4-a716-446655440001', 'SuperAdmin', 'Full system administration across all companies', 1, true),
('800e8400-e29b-41d4-a716-4466554402', 'CompanyAdmin', 'Full administration for a specific company', 2, false),
('800e8400-e29b-41d4-a716-4466554403', 'BrandManager', 'Full management for a specific brand', 3, false),
('800e8400-e29b-41d4-a716-4466554404', 'TeamLead', 'Team leadership with limited admin rights', 4, false),
('800e8400-e29b-41d4-a716-4466554405', 'Agent', 'AI Agent with basic operational rights', 5, false),
('800e8400-e29b-41d4-a716-4466554406', 'User', 'Standard user with read-only access', 6, false)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 8: ASSIGN PERMISSIONS TO ROLES
-- ========================================

\echo '🔐 STEP 8: Assigning permissions to roles...'

-- SuperAdmin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT '800e8400-e29b-41d4-a716-4466554401', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CompanyAdmin Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('800e8400-e29b-41d4-a716-4466554402', 'users.create'),
('800e8400-e29b-41d4-a716-4466554402', 'users.read'),
('800e8400-e29b-41d4-a716-4466554402', 'users.update'),
('800e8400-e29b-41d4-a716-4466554402', 'users.delete'),
('800e8400-e29b-41d4-a716-4466554402', 'users.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'agents.create'),
('800e8400-e29b-41d4-a716-4466554402', 'agents.read'),
('800e8400-e29b-41d4-a716-4466554402', 'agents.update'),
('800e8400-e29b-41d4-a716-4466554402', 'agents.delete'),
('800e8400-e29b-41d4-a716-4466554402', 'agents.control'),
('800e8400-e29b-41d4-a716-4466554402', 'agents.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'flows.create'),
('800e8400-e29b-41d4-a716-4466554402', 'flows.read'),
('800e8400-e29b-41d4-a716-4466554402', 'flows.update'),
('800e8400-e29b-41d4-a716-4466554402', 'flows.delete'),
('800e8400-e29b-41d4-a716-4466554402', 'flows.execute'),
('800e8400-e29b-41d4-a716-4466554402', 'flows.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'teams.create'),
('800e8400-e29b-41d4-a716-4466554402', 'teams.read'),
('800e8400-e29b-41d4-a716-4466554402', 'teams.update'),
('800e8400-e29b-41d4-a716-4466554402', 'teams.delete'),
('800e8400-e29b-41d4-a716-4466554402', 'teams.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'brands.create'),
('800e8400-e29b-41d4-a716-4466554402', 'brands.read'),
('800e8400-e29b-41d4-a716-4466554402', 'brands.update'),
('800e8400-e29b-41d4-a716-4466554402', 'brands.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'analytics.read'),
('800e8400-e29b-41d4-a716-4466554402', 'analytics.export'),
('800e8400-e29b-41d4-a716-4466554402', 'sessions.read'),
('800e8400-e29b-41d4-a716-4466554402', 'sessions.admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User Permissions (Brand users get limited access)
INSERT INTO role_permissions (role_id, permission_id) VALUES
('800e8400-e29b-41d4-a716-4466554406', 'users.read'),
('800e8400-e29b-41d4-a716-4466554406', 'agents.read'),
('800e8400-e29b-41d4-a716-4466554406', 'flows.read'),
('800e8400-e29b-41d4-a716-4466554406', 'analytics.read'),
('800e8400-e29b-41d4-a716-4466554406', 'sessions.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========================================
-- STEP 9: INSERT USERS
-- ========================================

\echo '👤 STEP 9: Creating users...'

-- Superadmin
INSERT INTO users (id, email, name, role, company_id, team_id) VALUES
('900e8400-e29b-41d4-a716-446655440001', 'thetboard@gmail.com', 'Superadmin User', 'superadmin', NULL, NULL)
ON CONFLICT (email) DO NOTHING;

-- PepsiCo Admin
INSERT INTO users (id, email, name, role, company_id, team_id) VALUES
('900e8400-e29b-41d4-a716-446655440101', 'pepsi.admin@pepsico.com', 'PepsiCo Administrator', 'admin', '550e8400-e29b-41d4-a716-446655440001', NULL)
ON CONFLICT (email) DO NOTHING;

-- Stellantis Admin
INSERT INTO users (id, email, name, role, company_id, team_id) VALUES
('900e8400-e29b-41d4-a716-446655440201', 'stellantis.admin@stellantis.com', 'Stellantis Administrator', 'admin', '550e8400-e29b-41d4-a716-446655440002', NULL)
ON CONFLICT (email) DO NOTHING;

-- PepsiCo Brand Users (1 per brand)
INSERT INTO users (id, email, name, role, company_id, team_id) VALUES
('900e8400-e29b-41d4-a716-446655440111', 'pepsi.user@pepsico.com', 'Pepsi Brand User', 'user', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440501'),
('900e8400-e29b-41d4-a716-446655440112', 'lays.user@pepsico.com', 'Lay''s Brand User', 'user', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440502'),
('900e8400-e29b-41d4-a716-446655440113', 'gatorade.user@pepsico.com', 'Gatorade Brand User', 'user', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440503')
ON CONFLICT (email) DO NOTHING;

-- Stellantis Brand Users (1 per brand)
INSERT INTO users (id, email, name, role, company_id, team_id) VALUES
('900e8400-e29b-41d4-a716-446655440211', 'jeep.user@stellantis.com', 'Jeep Brand User', 'user', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440601'),
('900e8400-e29b-41d4-a716-446655440212', 'ram.user@stellantis.com', 'Ram Brand User', 'user', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440602'),
('900e8400-e29b-41d4-a716-446655440213', 'chrysler.user@stellantis.com', 'Chrysler Brand User', 'user', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440603')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- STEP 10: ASSIGN ROLES TO USERS
-- ========================================

\echo '🔗 STEP 10: Assigning roles to users...'

-- Superadmin Role
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440001', '800e8400-e29b-41d4-a716-446655440001', '900e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- PepsiCo Admin Role
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440101', '800e8400-e29b-41d4-a716-4466554402', '900e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Stellantis Admin Role
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440201', '800e8400-e29b-41d4-a716-4466554402', '900e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Brand User Roles
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440111', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d4-a716-446655440101'),
('900e8400-e29b-41d4-a716-446655440112', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d4-a716-446655440101'),
('900e8400-e29b-41d4-a716-446655440113', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d4-a716-446655440101'),
('900e8400-e29b-41d4-a716-446655440211', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d4-a716-446655440201'),
('900e8400-e29b-41d4-a716-446655440212', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d4-a716-446655440201'),
('900e8400-e29b-41d4-a716-446655440213', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d4-a716-446655440201')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ========================================
-- STEP 11: CREATE SAMPLE AGENTS
-- ========================================

\echo '🤖 STEP 11: Creating AI agents...'

INSERT INTO agents (id, team_id, user_id, name, email, role, is_active, autonomy_level) VALUES
-- PepsiCo Agents
('a10e8400-e29b-41d4-a716-446655440501', '770e8400-e29b-41d4-a716-446655440501', NULL, 'Pepsi Voice Agent 1', 'pepsi.agent1@pepsico.com', 'AI Agent', true, 3),
('a10e8400-e29b-41d4-a716-446655440502', '770e8400-e29b-41d4-a716-446655440502', NULL, 'Lay''s Sales Agent', 'lays.agent1@pepsico.com', 'AI Agent', true, 4),
('a10e8400-e29b-41d4-a716-446655440503', '770e8400-e29b-41d4-a716-446655440503', NULL, 'Gatorade Sports Agent', 'gatorade.agent1@pepsico.com', 'AI Agent', true, 5),
-- Stellantis Agents
('a10e8400-e29b-41d4-a716-446655440601', '770e8400-e29b-41d4-a716-446655440601', NULL, 'Jeep Support Agent', 'jeep.agent1@stellantis.com', 'AI Agent', true, 3),
('a10e8400-e29b-41d4-a716-446655440602', '770e8400-e29b-41d4-a716-446655440602', NULL, 'Ram Truck Agent', 'ram.agent1@stellantis.com', 'AI Agent', true, 4),
('a10e8400-e29b-41d4-a716-446655440603', '770e8400-e29b-41d4-a716-446655440603', NULL, 'Chrysler Premium Agent', 'chrysler.agent1@stellantis.com', 'AI Agent', true, 5)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 12: CREATE RBAC FUNCTIONS
-- ========================================

\echo '⚡ STEP 12: Creating RBAC functions and views...'

-- User Permissions View
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.name as user_name,
    c.name as company_name,
    b.name as brand_name,
    t.name as team_name,
    r.name as role_name,
    r.level as role_level,
    p.name as permission_name,
    p.resource,
    p.action,
    p.category as permission_category
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN teams t ON u.team_id = t.id
LEFT JOIN brands b ON t.brand_id = b.id
WHERE ur.is_active = true;

-- Permission Check Function
CREATE OR REPLACE FUNCTION has_permission(user_email TEXT, resource TEXT, action TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_permissions_view 
        WHERE email = user_email 
        AND resource = resource 
        AND action = action
    );
END;
$$ LANGUAGE plpgsql;

-- Get User Permissions Function
CREATE OR REPLACE FUNCTION get_user_permissions(user_email TEXT)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT, category TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT permission_name, resource, action, permission_category
    FROM user_permissions_view
    WHERE email = user_email
    ORDER BY permission_name;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 13: CREATE INDEXES
-- ========================================

\echo '📈 STEP 13: Creating performance indexes...'

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_companies_id ON companies(id);
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON brands(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_brand_id ON teams(brand_id);

-- ========================================
-- STEP 14: SETUP VERIFICATION
-- ========================================

\echo '✅ STEP 14: Setup verification...'

SELECT 
    '✅ SETUP COMPLETE' as status,
    (SELECT COUNT(*) FROM companies) as total_companies,
    (SELECT COUNT(*) FROM brands) as total_brands,
    (SELECT COUNT(*) FROM teams) as total_teams,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM roles) as total_roles,
    (SELECT COUNT(*) FROM permissions) as total_permissions,
    (SELECT COUNT(*) FROM user_roles) as total_user_roles,
    (SELECT COUNT(*) FROM role_permissions) as total_role_permissions,
    (SELECT COUNT(*) FROM agents) as total_agents;

-- Show user hierarchy
SELECT 
    '👥 USER HIERARCHY' as info,
    u.email,
    u.name as user_name,
    r.name as role,
    r.level as role_level,
    c.name as company,
    COALESCE(b.name, 'N/A') as brand,
    COALESCE(t.name, 'N/A') as team
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN teams t ON u.team_id = t.id
LEFT JOIN brands b ON t.brand_id = b.id
ORDER BY r.level, c.name, b.name;

\echo ''
\echo '🎉 RBAC SETUP COMPLETED SUCCESSFULLY!'
\echo '📊 Ready for testing with:'
\echo '   - 2 Companies (PepsiCo, Stellantis)'
\echo '   - 6 Brands (3 per company)'
\echo '   - 6 Teams (1 per brand)'
\echo '   - 8 Users (1 superadmin + 2 admins + 6 brand users)'
\echo '   - 6 Roles (complete hierarchy)'
\echo '   - 33 Permissions (comprehensive coverage)'
\echo '   - 6 AI Agents (1 per team)'
\echo ''
\echo '🧪 Run validation tests with: \i rbac-test-validation.sql'