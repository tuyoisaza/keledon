-- ========================================
-- SIMPLIFIED RBAC SETUP FOR SUPABASE
-- Pure SQL with dynamic UUID generation
-- ========================================

-- Step 1: Create RBAC tables
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    is_system_role BOOLEAN DEFAULT false,
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
('system.config', 'system', 'config', 'Modify system configuration', 'system_admin');

-- Step 3: Insert roles
INSERT INTO roles (name, description, level, is_system_role) VALUES
('SuperAdmin', 'Full system administration across all companies', 1, true),
('CompanyAdmin', 'Full administration for a specific company', 2, false),
('BrandManager', 'Full management for a specific brand', 3, false),
('TeamLead', 'Team leadership with limited admin rights', 4, false),
('Agent', 'AI Agent with basic operational rights', 5, false),
('User', 'Standard user with read-only access', 6, false);

-- Step 4: Assign permissions to SuperAdmin (all permissions)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'SuperAdmin';

-- Step 5: Assign permissions to CompanyAdmin (no system permissions)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'CompanyAdmin' AND p.category NOT IN ('system_admin');

-- Step 6: Assign permissions to User (read-only)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'User' AND p.action IN ('read', 'export');

-- Step 7: Create basic companies (if they don't exist)
INSERT INTO companies (name, industry) VALUES
('PepsiCo', 'Food & Beverages'),
('Stellantis', 'Automotive')
ON CONFLICT (name) DO NOTHING;

-- Step 8: Create brands for each company
INSERT INTO brands (company_id, name) 
SELECT c.id, 'Test Brand - ' || c.name FROM companies c WHERE c.name = 'PepsiCo'
UNION ALL
SELECT c.id, 'Test Brand - ' || c.name FROM companies c WHERE c.name = 'Stellantis'
ON CONFLICT (company_id, name) DO NOTHING;

-- Step 9: Create test users
INSERT INTO users (email, name, company_id, role) 
SELECT 'superadmin@test.com', 'Superadmin User', c.id, 'superadmin' FROM companies c WHERE c.name = 'PepsiCo'
UNION ALL  
SELECT 'superadmin@test.com', 'Superadmin User', c.id, 'superadmin' FROM companies c WHERE c.name = 'Stellantis'
ON CONFLICT (email) DO NOTHING;

-- Step 10: Assign SuperAdmin role to test users
INSERT INTO user_roles (user_id, role_id, granted_by) 
SELECT u.id, r.id, u.id FROM users u, roles r 
WHERE u.role = 'superadmin' AND r.name = 'SuperAdmin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 11: Create RBAC functions
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

-- Step 12: Create user permissions view
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

-- Step 13: Verification query
SELECT 'Setup Complete' as status,
       (SELECT COUNT(*) FROM companies) as companies,
       (SELECT COUNT(*) FROM brands) as brands,
       (SELECT COUNT(*) FROM users) as users,
       (SELECT COUNT(*) FROM roles) as roles,
       (SELECT COUNT(*) FROM permissions) as permissions,
       (SELECT COUNT(*) FROM user_roles) as user_roles,
       (SELECT COUNT(*) FROM role_permissions) as role_permissions;