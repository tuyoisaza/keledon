-- ========================================
-- PURE SQL FOR SUPABASE - NO PostgreSQL-SPECIFIC SYNTAX
-- Complete RBAC setup for PepsiCo & Stellantis
-- ========================================

-- Step 1: Create tables
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    is_system_role BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Step 2: Insert permissions
INSERT INTO permissions (name, resource, action, description, category) VALUES
('users.create', 'users', 'create', 'Create new users', 'user_management'),
('users.read', 'users', 'read', 'View user information', 'user_management'),
('users.update', 'users', 'update', 'Update user information', 'user_management'),
('users.delete', 'users', 'delete', 'Delete users', 'user_management'),
('users.admin', 'users', 'admin', 'Full user administration', 'user_management'),
('agents.create', 'agents', 'create', 'Create new agents', 'agent_management'),
('agents.read', 'agents', 'read', 'View agent information', 'agent_management'),
('agents.update', 'agents', 'update', 'Update agent configuration', 'agent_management'),
('agents.delete', 'agents', 'delete', 'Delete agents', 'agent_management'),
('agents.control', 'agents', 'control', 'Start/stop/control agents', 'agent_management'),
('agents.admin', 'agents', 'admin', 'Full agent administration', 'agent_management'),
('flows.create', 'flows', 'create', 'Create new RPA flows', 'flow_management'),
('flows.read', 'flows', 'read', 'View RPA flows', 'flow_management'),
('flows.update', 'flows', 'update', 'Update RPA flows', 'flow_management'),
('flows.delete', 'flows', 'delete', 'Delete RPA flows', 'flow_management'),
('flows.execute', 'flows', 'execute', 'Execute RPA flows', 'flow_management'),
('flows.admin', 'flows', 'admin', 'Full flow administration', 'flow_management'),
('analytics.read', 'analytics', 'read', 'View analytics and reports', 'analytics'),
('analytics.export', 'analytics', 'export', 'Export analytics data', 'analytics'),
('analytics.admin', 'analytics', 'admin', 'Full analytics administration', 'analytics'),
('teams.create', 'teams', 'create', 'Create new teams', 'team_management'),
('teams.read', 'teams', 'read', 'View team information', 'team_management'),
('teams.update', 'teams', 'update', 'Update team information', 'team_management'),
('teams.delete', 'teams', 'delete', 'Delete teams', 'team_management'),
('teams.admin', 'teams', 'admin', 'Full team administration', 'team_management'),
('brands.create', 'brands', 'create', 'Create new brands', 'brand_management'),
('brands.read', 'brands', 'read', 'View brand information', 'brand_management'),
('brands.update', 'brands', 'update', 'Update brand information', 'brand_management'),
('brands.delete', 'brands', 'delete', 'Delete brands', 'brand_management'),
('brands.admin', 'brands', 'admin', 'Full brand administration', 'brand_management'),
('companies.read', 'companies', 'read', 'View company information', 'company_management'),
('companies.update', 'companies', 'update', 'Update company information', 'company_management'),
('companies.admin', 'companies', 'admin', 'Full company administration', 'company_management'),
('system.admin', 'system', 'admin', 'Full system administration', 'system_admin'),
('system.audit', 'system', 'audit', 'View system audit logs', 'system_admin'),
('system.config', 'system', 'config', 'Modify system configuration', 'system_admin'),
('sessions.create', 'sessions', 'create', 'Create new sessions', 'session_management'),
('sessions.read', 'sessions', 'read', 'View session information', 'session_management'),
('sessions.update', 'sessions', 'update', 'Update session information', 'session_management'),
('sessions.delete', 'sessions', 'delete', 'Delete sessions', 'session_management'),
('sessions.admin', 'sessions', 'admin', 'Full session administration', 'session_management');

-- Step 3: Insert companies
INSERT INTO companies (id, name, industry, agent_count) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'PepsiCo', 'Food & Beverages', 2500),
('550e8400-e29b-41d4-a716-446655440002', 'Stellantis', 'Automotive', 1800);

-- Step 4: Clear and insert brands
DELETE FROM brands WHERE company_id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO brands (id, company_id, name, color) VALUES
('660e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Pepsi', '#004B93'),
('660e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'Lay''s', '#FFD700'),
('660e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 'Gatorade', '#FF6B35'),
('660e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440002', 'Jeep', '#000000'),
('660e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440002', 'Ram', '#C41230'),
('660e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440002', 'Chrysler', '#1A3A5F');

-- Step 5: Clear and insert teams
DELETE FROM teams WHERE brand_id IN (SELECT id FROM brands WHERE company_id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'));

INSERT INTO teams (id, brand_id, name, member_count) VALUES
('770e8400-e29b-41d4-a716-446655440501', '660e8400-e29b-41d4-a716-446655440101', 'Pepsi Customer Service', 25),
('770e8400-e29b-41d4-a716-446655440502', '660e8400-e29b-41d4-a716-446655440102', 'Lay''s Sales Team', 18),
('770e8400-e29b-41d4-a716-446655440503', '660e8400-e29b-41d4-a716-446655440103', 'Gatorade Sports Team', 20),
('770e8400-e29b-41d4-a716-446655440601', '660e8400-e29b-41d4-a716-446655440201', 'Jeep Support Team', 22),
('770e8400-e29b-41d4-a716-446655440602', '660e8400-e29b-41d4-a716-446655440202', 'Ram Truck Division', 15),
('770e8400-e29b-41d4-a716-446655440603', '660e8400-e29b-41d4-a716-446655440203', 'Chrysler Premium', 12);

-- Step 6: Insert roles
INSERT INTO roles (id, name, description, level, is_system_role) VALUES
('800e8400-e29b-41d4-a716-4466554401', 'SuperAdmin', 'Full system administration across all companies', 1, true),
('800e8400-e29b-41d4-a716-4466554402', 'CompanyAdmin', 'Full administration for a specific company', 2, false),
('800e8400-e29b-41d4-a716-4466554403', 'BrandManager', 'Full management for a specific brand', 3, false),
('800e8400-e29b-41d4-a716-4466554404', 'TeamLead', 'Team leadership with limited admin rights', 4, false),
('800e8400-e29b-41d4-a716-4466554405', 'Agent', 'AI Agent with basic operational rights', 5, false),
('800e8400-e29b-41d4-a716-4466554406', 'User', 'Standard user with read-only access', 6, false);

-- Step 7: Assign permissions to roles
-- SuperAdmin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT '800e8400-e29b-41d4-a716-4466554401', id FROM permissions;

-- CompanyAdmin Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('800e8400-e29b-41d4-a716-4466554402', 'users.create'), ('800e8400-e29b-41d4-a716-4466554402', 'users.read'), ('800e8400-e29b-41d4-a716-4466554402', 'users.update'), ('800e8400-e29b-41d4-a716-4466554402', 'users.delete'), ('800e8400-e29b-41d4-a716-4466554402', 'users.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'agents.create'), ('800e8400-e29b-41d4-a716-4466554402', 'agents.read'), ('800e8400-e29b-41d4-a716-4466554402', 'agents.update'), ('800e8400-e29b-41d4-a716-4466554402', 'agents.delete'),
('800e8400-e29b-41d4-a716-4466554402', 'agents.control'), ('800e8400-e29b-41d4-a716-4466554402', 'agents.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'flows.create'), ('800e8400-e29b-41d4-a716-4466554402', 'flows.read'), ('800e8400-e29b-41d4-a716-4466554402', 'flows.update'), ('800e8400-e29b-41d4-a716-4466554402', 'flows.delete'),
('800e8400-e29b-41d4-a716-4466554402', 'flows.execute'), ('800e8400-e29b-41d4-a716-4466554402', 'flows.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'teams.create'), ('800e8400-e29b-41d4-a716-4466554402', 'teams.read'), ('800e8400-e29b-41d4-a7716-4466554402', 'teams.update'), ('800e8400-e29b-41d4-a716-4466554402', 'teams.delete'), ('800e8400-e29b-41d4-a716-4466554402', 'teams.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'brands.create'), ('800e8400-e29b-41d4-a716-4466554402', 'brands.read'), ('800e8400-e29b-41d4-a716-4466554402', 'brands.update'), ('800e8400-e29b-41d4-a716-4466554402', 'brands.admin'),
('800e8400-e29b-41d4-a716-4466554402', 'analytics.read'), ('800e8400-e29b-41d4-a716-4466554402', 'analytics.export'), ('800e8400-e29b-41d4-a716-4466554402', 'sessions.read'), ('800e8400-e29b-41d4-a716-4466554402', 'sessions.admin');

-- User Permissions (Brand users get limited access)
INSERT INTO role_permissions (role_id, permission_id) VALUES
('800e8400-e29b-41d4-a716-4466554406', 'users.read'), ('800e8400-e29b-41d4-a716-4466554406', 'agents.read'), ('800e8400-e29b-41d4-a716-4466554406', 'flows.read'), ('800e8400-e29b-41d4-a716-4466554406', 'analytics.read'), ('800e8400-e29b-41d4-a716-4466554406', 'sessions.read');

-- Step 8: Insert users
INSERT INTO users (id, email, name, role, company_id, team_id) VALUES
('900e8400-e29b-41d4-a716-4466554401', 'thetboard@gmail.com', 'Superadmin User', 'superadmin', NULL, NULL),
('900e8400-e29b-41d4-a716-44665544101', 'pepsi.admin@pepsico.com', 'PepsiCo Administrator', 'admin', '550e8400-e29b-41d4-a716-4466554401', NULL),
('900e8400-e29b-41d4-a716-44665544201', 'stellantis.admin@stellantis.com', 'Stellantis Administrator', 'admin', '550e8400-e29b-41d4-a716-4466554402', NULL),
('900e8400-e29b-41d4-a716-446655440111', 'pepsi.user@pepsico.com', 'Pepsi Brand User', 'user', '550e8400-e29b-41d4-a716-4466554401', '770e8400-e29b-41d4-a716-446655440501'),
('900e8400-e29b-41d4-a716-446655440112', 'lays.user@pepsico.com', 'Lay''s Brand User', 'user', '550e8400-e29b-41d4-a716-4466554401', '770e8400-e29b-41d4-a716-446655440502'),
('900e8400-e29b-41d4-a716-446655440113', 'gatorade.user@pepsico.com', 'Gatorade Brand User', 'user', '550e8400-e29b-41d4-a716-4466554401', '770e8400-e29b-41d4-a716-446655440503'),
('900e8400-e29b-41d4-a716-446655440211', 'jeep.user@stellantis.com', 'Jeep Brand User', 'user', '550e8400-e29b-41d4-a716-4466554402', '770e8400-e29b-41d4-a716-446655440601'),
('900e8400-e29b-41d4-a716-446655440212', 'ram.user@stellantis.com', 'Ram Brand User', 'user', '550e8400-e29b-41d4-a716-4466554402', '770e8400-e29b-41d4-a716-446655440602'),
('900e8400-e29b-41d4-a716-446655440213', 'chrysler.user@stellantis.com', 'Chrysler Brand User', 'user', '550e8400-e29b-41d4-a716-4466554402', '770e8400-e29b-41d4-a716-446655440603');

-- Step 9: Assign roles to users
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-4466554401', '800e8400-e29b-41d4-a716-4466554401', '900e8400-e29b-41d4-a716-4466554401'),
('900e8400-e29b-41d4-a716-446655440101', '800e8400-e29b-41d4-a716-4466554402', '900e8400-e29b-41d4-a716-4466554401'),
('900e8400-e29b-41d4-a716-44665544201', '800e8400-e29b-41d4-a716-4466554402', '900e8400-e29b-41d-4-a716-4466554401'),
('900e8400-e29b-41d4-a716-446655440111', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d4-a716-4466554401'),
('900e8400-e29b-41d4-a716-446655440112', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d-4-a716-4466554401'),
('900e8400-e29b-41d4-a716-446655440113', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d-4-a716-4466554401'),
('900e8400-e29b-41d4-a716-446655440211', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d-4-a716-4466554401'),
('900e8400-e29b-41d4-a716-446655440212', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d4-a716-4466554401'),
('900e8400-e29b-41d4-a716-446655440213', '800e8400-e29b-41d4-a716-4466554406', '900e8400-e29b-41d-4-a716-4466554401');

-- Step 10: Create sample agents
INSERT INTO agents (id, team_id, user_id, name, email, role, is_active, autonomy_level) VALUES
('a10e8400-e29b-41d4-a716-44665540501', '770e8400-e29b-41d4-a716-446655440501', NULL, 'Pepsi Voice Agent 1', 'pepsi.agent1@pepsico.com', 'AI Agent', true, 3),
('a10e8400-e29b-41d4-a716-44665540502', '770e8400-e29b-41d4-a716-446655440502', NULL, 'Lay''s Sales Agent', 'lays.agent1@pepsico.com', 'AI Agent', true, 4),
('a10e8400-e29b-41d4-a716-44665540503', '770e8400-e29b-41d4-a716-44665540503', NULL, 'Gatorade Sports Agent', 'gatorade.agent1@pepsico.com', 'AI Agent', true, 5),
('a10e8400-e29b-41d4-a716-44665540601', '770e8400-e29b-41d4-a716-446655440201', NULL, 'Jeep Support Agent', 'jeep.agent1@stellantis.com', 'AI Agent', true, 3),
('a10e8400-e29b-41d4-a716-446655440602', '770e8400-e29b-41d4-a716-446655440202', NULL, 'Ram Truck Agent', 'ram.agent1@stellantis.com', 'AI Agent', true, 4),
('a10e8400-e29b-41d4-a716-446655440603', '770e8400-e29b-41d4-a716-446655440203', NULL, 'Chrysler Premium Agent', 'chrysler.agent1@stellantis.com', 'AI Agent', true, 5);

-- Step 11: Create RBAC views and functions
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

-- Step 12: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_companies_id ON companies(id);
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON brands(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_brand_id ON teams(brand_id);

-- Step 13: Verification
SELECT 
    'RBAC SETUP COMPLETE' as status,
    (SELECT COUNT(*) FROM companies) as total_companies,
    (SELECT COUNT(*) FROM brands) as total_brands,
    (SELECT COUNT(*) FROM teams) as total_teams,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM roles) as total_roles,
    (SELECT COUNT(*) FROM permissions) as total_permissions,
    (SELECT COUNT(*) FROM user_roles) as total_user_roles,
    (SELECT COUNT(*) FROM role_permissions) as total_role_permissions,
    (SELECT COUNT(*) FROM agents) as total_agents;

SELECT 
    'USER HIERARCHY' as info,
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