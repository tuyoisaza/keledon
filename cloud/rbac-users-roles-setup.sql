-- ========================================
-- RBAC USERS & ROLES FOR PEPSICO & STELLANTIS
-- Complete user hierarchy with superadmin, company admins, and brand users
-- ========================================

-- ========================================
-- SYSTEM-WIDE ROLES DEFINITION
-- ========================================

-- System Roles (Level 1 = Highest)
INSERT INTO roles (id, name, description, level, is_system_role) VALUES
-- System Roles
('800e8400-e29b-41d4-a716-446655440001', 'SuperAdmin', 'Full system administration across all companies', 1, true),
('800e8400-e29b-41d4-a716-446655440002', 'CompanyAdmin', 'Full administration for a specific company', 2, false),
('800e8400-e29b-41d4-a716-4466554403', 'BrandManager', 'Full management for a specific brand', 3, false),
('800e8400-e29b-41d4-a716-4466554404', 'TeamLead', 'Team leadership with limited admin rights', 4, false),
('800e8400-e29b-41d4-a716-4466554405', 'Agent', 'AI Agent with basic operational rights', 5, false),
('800e8400-e29b-41d4-a716-4466554406', 'User', 'Standard user with read-only access', 6, false)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- ROLE PERMISSIONS MAPPING
-- ========================================

-- SuperAdmin Permissions (All permissions)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT '800e8400-e29b-41d4-a716-446655440001', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CompanyAdmin Permissions (Company-wide access)
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

-- BrandManager Permissions (Brand-specific access)
INSERT INTO role_permissions (role_id, permission_id) VALUES
('800e8400-e29b-41d4-a716-4466554403', 'users.read'),
('800e8400-e29b-41d4-a716-4466554403', 'users.update'),
('800e8400-e29b-41d4-a716-4466554403', 'agents.create'),
('800e8400-e29b-41d4-a716-4466554403', 'agents.read'),
('800e8400-e29b-41d4-a716-4466554403', 'agents.update'),
('800e8400-e29b-41d4-a716-4466554403', 'agents.control'),
('800e8400-e29b-41d4-a716-4466554403', 'flows.create'),
('800e8400-e29b-41d4-a716-4466554403', 'flows.read'),
('800e8400-e29b-41d4-a716-4466554403', 'flows.update'),
('800e8400-e29b-41d4-a716-4466554403', 'flows.execute'),
('800e8400-e29b-41d4-a716-4466554403', 'teams.read'),
('800e8400-e29b-41d4-a716-4466554403', 'teams.update'),
('800e8400-e29b-41d4-a716-4466554403', 'brands.read'),
('800e8400-e29b-41d4-a716-4466554403', 'analytics.read'),
('800e8400-e29b-41d4-a716-4466554403', 'sessions.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Agent Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('800e8400-e29b-41d4-a716-4466554405', 'agents.read'),
('800e8400-e29b-41d4-a716-4466554405', 'agents.update'),
('800e8400-e29b-41d4-a716-4466554405', 'flows.read'),
('800e8400-e29b-41d4-a716-4466554405', 'flows.execute'),
('800e8400-e29b-41d4-a716-4466554405', 'sessions.read'),
('800e8400-e29b-41d4-a716-4466554405', 'sessions.update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User Permissions (Read-only)
INSERT INTO role_permissions (role_id, permission_id) VALUES
('800e8400-e29b-41d4-a716-4466554406', 'users.read'),
('800e8400-e29b-41d4-a716-4466554406', 'agents.read'),
('800e8400-e29b-41d4-a716-4466554406', 'flows.read'),
('800e8400-e29b-41d4-a716-4466554406', 'analytics.read'),
('800e8400-e29b-41d4-a716-4466554406', 'sessions.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========================================
-- UPDATE COMPANIES TO HAVE 3 BRANDS EACH
-- ========================================

-- Clear existing brands and teams for clean setup
DELETE FROM teams WHERE brand_id IN (
    SELECT id FROM brands WHERE company_id IN (
        '550e8400-e29b-41d4-a716-446655440001', 
        '550e8400-e29b-41d4-a716-446655440002'
    )
);

DELETE FROM brands WHERE company_id IN (
    '550e8400-e29b-41d4-a716-446655440001', 
    '550e8400-e29b-41d4-a716-446655440002'
);

-- PepsiCo - 3 Brands
INSERT INTO brands (id, company_id, name, color) VALUES
('660e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Pepsi', '#004B93'),
('660e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'Lay''s', '#FFD700'),
('660e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 'Gatorade', '#FF6B35')
ON CONFLICT (id) DO NOTHING;

-- Stellantis - 3 Brands
INSERT INTO brands (id, company_id, name, color) VALUES
('660e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440002', 'Jeep', '#000000'),
('660e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440002', 'Ram', '#C41230'),
('660e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440002', 'Chrysler', '#1A3A5F')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- CREATE TEAMS FOR EACH BRAND
-- ========================================

-- PepsiCo Teams
INSERT INTO teams (id, brand_id, name, member_count) VALUES
('770e8400-e29b-41d4-a716-446655440501', '660e8400-e29b-41d4-a716-446655440101', 'Pepsi Customer Service', 25),
('770e8400-e29b-41d4-a716-446655440502', '660e8400-e29b-41d4-a716-446655440102', 'Lay''s Sales Team', 18),
('770e8400-e29b-41d4-a716-446655440503', '660e8400-e29b-41d4-a716-446655440103', 'Gatorade Sports Team', 20),
-- Stellantis Teams
('770e8400-e29b-41d4-a716-446655440601', '660e8400-e29b-41d4-a716-446655440201', 'Jeep Support Team', 22),
('770e8400-e29b-41d4-a716-446655440602', '660e8400-e29b-41d4-a716-446655440202', 'Ram Truck Division', 15),
('770e8400-e29b-41d4-a716-446655440603', '660e8400-e29b-41d4-a716-446655440203', 'Chrysler Premium', 12)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- CREATE USERS
-- ========================================

-- Superadmin (System-wide)
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
-- Pepsi Brand User
('900e8400-e29b-41d4-a716-446655440111', 'pepsi.user@pepsico.com', 'Pepsi Brand User', 'user', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440501'),
-- Lay's Brand User
('900e8400-e29b-41d4-a716-446655440112', 'lays.user@pepsico.com', 'Lay''s Brand User', 'user', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440502'),
-- Gatorade Brand User
('900e8400-e29b-41d4-a716-446655440113', 'gatorade.user@pepsico.com', 'Gatorade Brand User', 'user', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440503')
ON CONFLICT (email) DO NOTHING;

-- Stellantis Brand Users (1 per brand)
INSERT INTO users (id, email, name, role, company_id, team_id) VALUES
-- Jeep Brand User
('900e8400-e29b-41d4-a716-446655440211', 'jeep.user@stellantis.com', 'Jeep Brand User', 'user', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440601'),
-- Ram Brand User
('900e8400-e29b-41d4-a716-446655440212', 'ram.user@stellantis.com', 'Ram Brand User', 'user', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440602'),
-- Chrysler Brand User
('900e8400-e29b-41d4-a716-446655440213', 'chrysler.user@stellantis.com', 'Chrysler Brand User', 'user', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440603')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- ASSIGN ROLES TO USERS
-- ========================================

-- Superadmin Role Assignment
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440001', '800e8400-e29b-41d4-a716-446655440001', '900e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- PepsiCo Admin Role Assignment
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440101', '800e8400-e29b-41d4-a716-4466554402', '900e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Stellantis Admin Role Assignment
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440201', '800e8400-e29b-41d4-a716-4466554402', '900e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- PepsiCo Brand User Role Assignments
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440111', '800e8400-e29b-41d4-a716-4466554403', '900e8400-e29b-41d4-a716-446655440101'),
('900e8400-e29b-41d4-a716-446655440112', '800e8400-e29b-41d4-a716-4466554403', '900e8400-e29b-41d4-a716-446655440101'),
('900e8400-e29b-41d4-a716-446655440113', '800e8400-e29b-41d4-a716-4466554403', '900e8400-e29b-41d4-a716-446655440101')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Stellantis Brand User Role Assignments
INSERT INTO user_roles (user_id, role_id, granted_by) VALUES
('900e8400-e29b-41d4-a716-446655440211', '800e8400-e29b-41d4-a716-4466554403', '900e8400-e29b-41d4-a716-446655440201'),
('900e8400-e29b-41d4-a716-446655440212', '800e8400-e29b-41d4-a716-4466554403', '900e8400-e29b-41d4-a716-446655440201'),
('900e8400-e29b-41d4-a716-446655440213', '800e8400-e29b-41d4-a716-4466554403', '900e8400-e29b-41d4-a716-446655440201')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ========================================
-- CREATE SAMPLE AGENTS FOR EACH TEAM
-- ========================================

-- PepsiCo Agents
INSERT INTO agents (id, team_id, user_id, name, email, role, is_active, autonomy_level) VALUES
-- Pepsi Team Agents
('a10e8400-e29b-41d4-a716-446655440501', '770e8400-e29b-41d4-a716-446655440501', NULL, 'Pepsi Voice Agent 1', 'pepsi.agent1@pepsico.com', 'AI Agent', true, 3),
('a10e8400-e29b-41d4-a716-446655440502', '770e8400-e29b-41d4-a716-446655440501', NULL, 'Pepsi Voice Agent 2', 'pepsi.agent2@pepsico.com', 'AI Agent', true, 2),
-- Lay's Team Agents
('a10e8400-e29b-41d4-a716-446655440503', '770e8400-e29b-41d4-a716-446655440502', NULL, 'Lay''s Sales Agent', 'lays.agent1@pepsico.com', 'AI Agent', true, 3),
-- Gatorade Team Agents
('a10e8400-e29b-41d4-a716-446655440504', '770e8400-e29b-41d4-a716-446655440503', NULL, 'Gatorade Sports Agent', 'gatorade.agent1@pepsico.com', 'AI Agent', true, 4)
ON CONFLICT (id) DO NOTHING;

-- Stellantis Agents
INSERT INTO agents (id, team_id, user_id, name, email, role, is_active, autonomy_level) VALUES
-- Jeep Team Agents
('a10e8400-e29b-41d4-a716-446655440601', '770e8400-e29b-41d4-a716-446655440601', NULL, 'Jeep Support Agent', 'jeep.agent1@stellantis.com', 'AI Agent', true, 3),
('a10e8400-e29b-41d4-a716-446655440602', '770e8400-e29b-41d4-a716-446655440601', NULL, 'Jeep Technical Agent', 'jeep.agent2@stellantis.com', 'AI Agent', true, 2),
-- Ram Team Agents
('a10e8400-e29b-41d4-a716-446655440603', '770e8400-e29b-41d4-a716-446655440602', NULL, 'Ram Truck Agent', 'ram.agent1@stellantis.com', 'AI Agent', true, 3),
-- Chrysler Team Agents
('a10e8400-e29b-41d4-a716-446655440604', '770e8400-e29b-41d4-a716-446655440603', NULL, 'Chrysler Premium Agent', 'chrysler.agent1@stellantis.com', 'AI Agent', true, 4)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- SAMPLE SESSIONS DATA
-- ========================================

INSERT INTO sessions (id, agent_id, user_id, status, start_time, duration_minutes, summary) VALUES
-- PepsiCo Sessions
('s10e8400-e29b-41d4-a716-446655440001', 'a10e8400-e29b-41d4-a716-446655440501', NULL, 'completed', NOW() - INTERVAL '2 hours', 120, 'Customer service call - Pepsi product inquiry'),
('s10e8400-e29b-41d4-a716-446655440002', 'a10e8400-e29b-41d4-a716-446655440502', NULL, 'active', NOW() - INTERVAL '30 minutes', 30, 'Ongoing customer service interaction'),
-- Stellantis Sessions
('s10e8400-e29b-41d4-a716-446655440003', 'a10e8400-e29b-41d4-a716-446655440601', NULL, 'completed', NOW() - INTERVAL '1 hour', 60, 'Jeep technical support - warranty claim'),
('s10e8400-e29b-41d4-a716-446655440004', 'a10e8400-e29b-41d4-a716-446655440602', NULL, 'active', NOW() - INTERVAL '45 minutes', 45, 'Ram truck dealership inquiry')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- CREATE RBAC VIEW FOR EASY QUERIES
-- ========================================

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

-- ========================================
-- CREATE HELPER FUNCTIONS FOR RBAC CHECKS
-- ========================================

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

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

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
-- SUMMARY STATISTICS
-- ========================================

-- Verify the setup was successful
SELECT 
    'Setup Summary' as info,
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
    'User Hierarchy' as info,
    u.email,
    u.name as user_name,
    r.name as role,
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