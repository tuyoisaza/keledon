-- ========================================
-- DATABASE INSPECTION SCRIPT
-- Run this in Supabase SQL Editor
-- Copy the results and share with me
-- ========================================

-- 1. List all tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check RBAC-specific tables
SELECT 
    'Tables with "role" or "permission" in name:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%role%' OR table_name LIKE '%permission%')
ORDER BY table_name;

-- 3. Count records in key tables
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
    'companies' as table_name, 
    COUNT(*) as record_count  
FROM companies
UNION ALL
SELECT 
    'roles' as table_name, 
    COUNT(*) as record_count
FROM roles
UNION ALL
SELECT 
    'permissions' as table_name, 
    COUNT(*) as record_count
FROM permissions
UNION ALL
SELECT 
    'user_roles' as table_name, 
    COUNT(*) as record_count
FROM user_roles
UNION ALL
SELECT 
    'role_permissions' as table_name, 
    COUNT(*) as record_count
FROM role_permissions;

-- 4. Show existing permissions
SELECT 
    name,
    resource,
    action,
    category,
    created_at
FROM permissions 
ORDER BY category, resource, action;

-- 5. Show existing roles  
SELECT 
    name,
    description,
    level,
    is_system_role,
    company_id,
    created_at
FROM roles 
ORDER BY level;

-- 6. Check existing user_roles
SELECT 
    ur.user_id,
    u.email as user_email,
    ur.role_id,
    r.name as role_name,
    ur.granted_at,
    ur.is_active
FROM user_roles ur
LEFT JOIN users u ON ur.user_id = u.id  
LEFT JOIN roles r ON ur.role_id = r.id
LIMIT 10;

-- 7. Check existing role_permissions
SELECT 
    rp.role_id,
    r.name as role_name,
    rp.permission_id,
    p.name as permission_name,
    p.resource,
    p.action
FROM role_permissions rp
LEFT JOIN roles r ON rp.role_id = r.id
LEFT JOIN permissions p ON rp.permission_id = p.id
LIMIT 10;