-- ========================================
-- RBAC SYSTEM SETUP FOR PEPSICO & STELLANTIS
-- Comprehensive test data for role-based access control
-- ========================================

-- ========================================
-- RBAC CORE TABLES
-- ========================================

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1, -- 1=highest, 10=lowest
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    is_system_role BOOLEAN DEFAULT false, -- System-wide roles vs company-specific
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    resource TEXT NOT NULL, -- e.g., 'users', 'agents', 'flows', 'analytics'
    action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'admin'
    description TEXT,
    category TEXT, -- e.g., 'user_management', 'agent_control', 'analytics'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_ROLES TABLE (Many-to-many)
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

-- ROLE_PERMISSIONS TABLE (Many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- ========================================
-- BASE PERMISSIONS DEFINITION
-- ========================================

-- User Management Permissions
INSERT INTO permissions (name, resource, action, description, category) VALUES
('users.create', 'users', 'create', 'Create new users', 'user_management'),
('users.read', 'users', 'read', 'View user information', 'user_management'),
('users.update', 'users', 'update', 'Update user information', 'user_management'),
('users.delete', 'users', 'delete', 'Delete users', 'user_management'),
('users.admin', 'users', 'admin', 'Full user administration', 'user_management'),

-- Agent Management Permissions
('agents.create', 'agents', 'create', 'Create new agents', 'agent_management'),
('agents.read', 'agents', 'read', 'View agent information', 'agent_management'),
('agents.update', 'agents', 'update', 'Update agent configuration', 'agent_management'),
('agents.delete', 'agents', 'delete', 'Delete agents', 'agent_management'),
('agents.control', 'agents', 'control', 'Start/stop/control agents', 'agent_management'),
('agents.admin', 'agents', 'admin', 'Full agent administration', 'agent_management'),

-- Flow Management Permissions
('flows.create', 'flows', 'create', 'Create new RPA flows', 'flow_management'),
('flows.read', 'flows', 'read', 'View RPA flows', 'flow_management'),
('flows.update', 'flows', 'update', 'Update RPA flows', 'flow_management'),
('flows.delete', 'flows', 'delete', 'Delete RPA flows', 'flow_management'),
('flows.execute', 'flows', 'execute', 'Execute RPA flows', 'flow_management'),
('flows.admin', 'flows', 'admin', 'Full flow administration', 'flow_management'),

-- Analytics Permissions
('analytics.read', 'analytics', 'read', 'View analytics and reports', 'analytics'),
('analytics.export', 'analytics', 'export', 'Export analytics data', 'analytics'),
('analytics.admin', 'analytics', 'admin', 'Full analytics administration', 'analytics'),

-- Team Management Permissions
('teams.create', 'teams', 'create', 'Create new teams', 'team_management'),
('teams.read', 'teams', 'read', 'View team information', 'team_management'),
('teams.update', 'teams', 'update', 'Update team information', 'team_management'),
('teams.delete', 'teams', 'delete', 'Delete teams', 'team_management'),
('teams.admin', 'teams', 'admin', 'Full team administration', 'team_management'),

-- Brand Management Permissions
('brands.create', 'brands', 'create', 'Create new brands', 'brand_management'),
('brands.read', 'brands', 'read', 'View brand information', 'brand_management'),
('brands.update', 'brands', 'update', 'Update brand information', 'brand_management'),
('brands.delete', 'brands', 'delete', 'Delete brands', 'brand_management'),
('brands.admin', 'brands', 'admin', 'Full brand administration', 'brand_management'),

-- Company Management Permissions
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
-- INSERT COMPANIES: PEPSICO & STELLANTIS
-- ========================================

-- PepsiCo Company
INSERT INTO companies (id, name, industry, agent_count) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'PepsiCo', 'Food & Beverages', 2500)
ON CONFLICT (id) DO NOTHING;

-- Stellantis Company  
INSERT INTO companies (id, name, industry, agent_count) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'Stellantis', 'Automotive', 1800)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- INSERT BRANDS FOR EACH COMPANY
-- ========================================

-- PepsiCo Brands
INSERT INTO brands (id, company_id, name, color) VALUES
('660e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Pepsi', '#004B93'),
('660e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'Mountain Dew', '#00A652'),
('660e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 'Gatorade', '#FF6B35'),
('660e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', 'Lay''s', '#FFD700'),
('660e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440001', 'Doritos', '#D40E2C'),
('660e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440001', 'Quaker', '#8B4513'),
('660e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440001', 'Tropicana', '#FFA500'),
('660e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440001', 'Frito-Lay', '#FF4444')
ON CONFLICT (id) DO NOTHING;

-- Stellantis Brands
INSERT INTO brands (id, company_id, name, color) VALUES
('660e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440002', 'Jeep', '#000000'),
('660e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440002', 'Ram', '#C41230'),
('660e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440002', 'Chrysler', '#1A3A5F'),
('660e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440002', 'Dodge', '#FF6B35'),
('660e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440002', 'Fiat', '#8B1538'),
('660e8400-e29b-41d4-a716-446655440206', '550e8400-e29b-41d4-a716-446655440002', 'Alfa Romeo', '#A91D3A'),
('660e8400-e29b-41d4-a716-446655440207', '550e8400-e29b-41d4-a716-446655440002', 'Maserati', '#0B4C8C'),
('660e8400-e29b-41d4-a716-446655440208', '550e8400-e29b-41d4-a716-446655440002', 'Peugeot', '#003380'),
('660e8400-e29b-41d4-a716-446655440209', '550e8400-e29b-41d4-a716-446655440002', 'Citroën', '#E20A17'),
('660e8400-e29b-41d4-a716-446655440210', '550e8400-e29b-41d4-a716-446655440002', 'Opel', '#FFFF00'),
('660e8400-e29b-41d4-a716-446655440211', '550e8400-e29b-41d4-a716-446655440002', 'Vauxhall', '#FF0000')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- INSERT TEAMS FOR EACH BRAND
-- ========================================

-- PepsiCo Teams
INSERT INTO teams (id, brand_id, name, member_count) VALUES
-- Pepsi Teams
('770e8400-e29b-41d4-a716-446655440501', '660e8400-e29b-41d4-a716-446655440101', 'Pepsi Sales Team', 25),
('770e8400-e29b-41d4-a716-446655440502', '660e8400-e29b-41d4-a716-446655440101', 'Pepsi Marketing Team', 18),
('770e8400-e29b-41d4-a716-446655440503', '660e8400-e29b-41d4-a716-446655440101', 'Pepsi Customer Service', 35),
-- Mountain Dew Teams
('770e8400-e29b-41d4-a716-446655440504', '660e8400-e29b-41d4-a716-446655440102', 'Mountain Dew Extreme Sports', 12),
('770e8400-e29b-41d4-a716-446655440505', '660e8400-e29b-41d4-a716-446655440102', 'Mountain Dew Marketing', 15),
-- Gatorade Teams
('770e8400-e29b-41d4-a716-446655440506', '660e8400-e29b-41d4-a716-446655440103', 'Gatorade Sports Science', 20),
('770e8400-e29b-41d4-a716-446655440507', '660e8400-e29b-41d4-a716-446655440103', 'Gatorade Pro Team', 8),
-- Lay's Teams
('770e8400-e29b-41d4-a716-446655440508', '660e8400-e29b-41d4-a716-446655440104', 'Lay''s Customer Experience', 30),
('770e8400-e29b-41d4-a716-446655440509', '660e8400-e29b-41d4-a716-446655440104', 'Lay''s Quality Control', 12),
-- Doritos Teams
('770e8400-e29b-41d4-a716-446655440510', '660e8400-e29b-41d4-a716-446655440105', 'Doritos Social Media', 10),
('770e8400-e29b-41d4-a716-446655440511', '660e8400-e29b-41d4-a716-446655440105', 'Doritos Innovation', 6)
ON CONFLICT (id) DO NOTHING;

-- Stellantis Teams
INSERT INTO teams (id, brand_id, name, member_count) VALUES
-- Jeep Teams
('770e8400-e29b-41d4-a716-446655440601', '660e8400-e29b-41d4-a716-446655440201', 'Jeep Off-Road Support', 22),
('770e8400-e29b-41d4-a716-446655440602', '660e8400-e29b-41d4-a716-446655440201', 'Jeep Technical Service', 18),
-- Ram Teams
('770e8400-e29b-41d4-a716-446655440603', '660e8400-e29b-41d4-a716-446655440202', 'Ram Truck Support', 25),
('770e8400-e29b-41d4-a716-446655440604', '660e8400-e29b-41d4-a716-446655440202', 'Ram Commercial Division', 15),
-- Chrysler Teams
('770e8400-e29b-41d4-a716-446655440203', '660e8400-e29b-41d4-a716-446655440203', 'Chrysler Premium Service', 20),
('770e8400-e29b-41d4-a716-446655440604', '660e8400-e29b-41d4-a716-446655440203', 'Chrysler Fleet Management', 12),
-- Dodge Teams
('770e8400-e29b-41d4-a716-446655440204', '660e8400-e29b-41d4-a716-446655440204', 'Dodge Performance Team', 16),
('770e8400-e29b-41d4-a716-446655440205', '660e8400-e29b-41d4-a716-446655440204', 'Dodge Muscle Car Division', 10)
ON CONFLICT (id) DO NOTHING;