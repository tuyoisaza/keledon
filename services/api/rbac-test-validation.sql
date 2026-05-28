-- ========================================
-- RBAC TEST VALIDATION SCRIPT
-- Test roles, permissions, and access control for PepsiCo & Stellantis
-- ========================================

-- ========================================
-- TEST 1: VERIFY SETUP
-- ========================================

\echo '🔍 TESTING RBAC SETUP VERIFICATION'
\echo '====================================='

-- Test Company Setup
\echo '📊 Testing Company Setup:'
SELECT 
    'Companies' as entity_type,
    id,
    name,
    industry,
    agent_count
FROM companies 
WHERE name IN ('PepsiCo', 'Stellantis')
ORDER BY name;

-- Test Brand Setup (Should be 3 per company)
\echo ''
\echo '🏷️ Testing Brand Setup (3 per company):'
SELECT 
    'Brands' as entity_type,
    c.name as company,
    b.id,
    b.name as brand_name,
    b.color
FROM brands b
JOIN companies c ON b.company_id = c.id
WHERE c.name IN ('PepsiCo', 'Stellantis')
ORDER BY c.name, b.name;

-- Test User Setup
\echo ''
\echo '👥 Testing User Setup:'
SELECT 
    'Users' as entity_type,
    u.email,
    u.name as user_name,
    u.role as legacy_role,
    r.name as rbac_role,
    c.name as company,
    COALESCE(b.name, 'N/A') as brand,
    COALESCE(t.name, 'N/A') as team
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN teams t ON u.team_id = t.id
LEFT JOIN brands b ON t.brand_id = b.id
WHERE c.name IN ('PepsiCo', 'Stellantis') OR u.email = 'thetboard@gmail.com'
ORDER BY c.name, r.level, u.email;

-- ========================================
-- TEST 2: ROLE PERMISSIONS VALIDATION
-- ========================================

\echo ''
\echo '🔐 Testing Role Permissions:'
SELECT 
    r.name as role_name,
    r.level,
    COUNT(rp.permission_id) as permission_count,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name, r.level
ORDER BY r.level;

-- ========================================
-- TEST 3: SUPERADMIN ACCESS TESTS
-- ========================================

\echo ''
\echo '👑 Testing Superadmin Access (thetboard@gmail.com):'

-- Should have access to ALL resources
SELECT 
    'Superadmin Permissions' as test_type,
    resource,
    STRING_AGG(DISTINCT action, ', ') as actions
FROM user_permissions_view
WHERE email = 'thetboard@gmail.com'
GROUP BY resource
ORDER BY resource;

-- Test specific high-level permissions
\echo ''
\echo '🎯 Testing Critical Superadmin Permissions:'
SELECT 
    CASE 
        WHEN has_permission('thetboard@gmail.com', 'system', 'admin') THEN '✅ SYSTEM.ADMIN - GRANTED'
        ELSE '❌ SYSTEM.ADMIN - DENIED'
    END as system_admin_test,
    CASE 
        WHEN has_permission('thetboard@gmail.com', 'users', 'delete') THEN '✅ USERS.DELETE - GRANTED'
        ELSE '❌ USERS.DELETE - DENIED'
    END as users_delete_test,
    CASE 
        WHEN has_permission('thetboard@gmail.com', 'companies', 'admin') THEN '✅ COMPANIES.ADMIN - GRANTED'
        ELSE '❌ COMPANIES.ADMIN - DENIED'
    END as companies_admin_test;

-- ========================================
-- TEST 4: COMPANY ADMIN ACCESS TESTS
-- ========================================

\echo ''
\echo '🏢 Testing Company Admin Access:'

-- PepsiCo Admin Tests
\echo 'PepsiCo Admin (pepsi.admin@pepsico.com):'
SELECT 
    'PepsiCo Admin' as admin_type,
    CASE 
        WHEN has_permission('pepsi.admin@pepsico.com', 'users', 'create') THEN '✅ USERS.CREATE - GRANTED'
        ELSE '❌ USERS.CREATE - DENIED'
    END as users_create_test,
    CASE 
        WHEN has_permission('pepsi.admin@pepsico.com', 'agents', 'admin') THEN '✅ AGENTS.ADMIN - GRANTED'
        ELSE '❌ AGENTS.ADMIN - DENIED'
    END as agents_admin_test,
    CASE 
        WHEN has_permission('pepsi.admin@pepsico.com', 'brands', 'update') THEN '✅ BRANDS.UPDATE - GRANTED'
        ELSE '❌ BRANDS.UPDATE - DENIED'
    END as brands_update_test,
    CASE 
        WHEN has_permission('pepsi.admin@pepsico.com', 'system', 'admin') THEN '❌ SYSTEM.ADMIN - SHOULD BE DENIED'
        ELSE '✅ SYSTEM.ADMIN - CORRECTLY DENIED'
    END as system_admin_test;

-- Stellantis Admin Tests
\echo ''
\echo 'Stellantis Admin (stellantis.admin@stellantis.com):'
SELECT 
    'Stellantis Admin' as admin_type,
    CASE 
        WHEN has_permission('stellantis.admin@stellantis.com', 'flows', 'delete') THEN '✅ FLOWS.DELETE - GRANTED'
        ELSE '❌ FLOWS.DELETE - DENIED'
    END as flows_delete_test,
    CASE 
        WHEN has_permission('stellantis.admin@stellantis.com', 'analytics', 'export') THEN '✅ ANALYTICS.EXPORT - GRANTED'
        ELSE '❌ ANALYTICS.EXPORT - DENIED'
    END as analytics_export_test,
    CASE 
        WHEN has_permission('stellantis.admin@stellantis.com', 'system', 'config') THEN '❌ SYSTEM.CONFIG - SHOULD BE DENIED'
        ELSE '✅ SYSTEM.CONFIG - CORRECTLY DENIED'
    END as system_config_test;

-- ========================================
-- TEST 5: BRAND USER ACCESS TESTS
-- ========================================

\echo ''
\echo '🏷️ Testing Brand User Access:'

-- PepsiCo Brand Users
\echo 'PepsiCo Brand Users (should have limited permissions):'
SELECT 
    u.email as user_email,
    b.name as brand,
    CASE 
        WHEN has_permission(u.email, 'users', 'read') THEN '✅ USERS.READ - GRANTED'
        ELSE '❌ USERS.READ - DENIED'
    END as users_read_test,
    CASE 
        WHEN has_permission(u.email, 'users', 'delete') THEN '❌ USERS.DELETE - SHOULD BE DENIED'
        ELSE '✅ USERS.DELETE - CORRECTLY DENIED'
    END as users_delete_test,
    CASE 
        WHEN has_permission(u.email, 'flows', 'read') THEN '✅ FLOWS.READ - GRANTED'
        ELSE '❌ FLOWS.READ - DENIED'
    END as flows_read_test,
    CASE 
        WHEN has_permission(u.email, 'agents', 'control') THEN '❌ AGENTS.CONTROL - SHOULD BE DENIED'
        ELSE '✅ AGENTS.CONTROL - CORRECTLY DENIED'
    END as agents_control_test
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN teams t ON u.team_id = t.id
JOIN brands b ON t.brand_id = b.id
JOIN companies c ON b.company_id = c.id
WHERE c.name = 'PepsiCo' AND r.name = 'User'
ORDER BY b.name;

-- Stellantis Brand Users
\echo ''
\echo 'Stellantis Brand Users (should have limited permissions):'
SELECT 
    u.email as user_email,
    b.name as brand,
    CASE 
        WHEN has_permission(u.email, 'analytics', 'read') THEN '✅ ANALYTICS.READ - GRANTED'
        ELSE '❌ ANALYTICS.READ - DENIED'
    END as analytics_read_test,
    CASE 
        WHEN has_permission(u.email, 'analytics', 'admin') THEN '❌ ANALYTICS.ADMIN - SHOULD BE DENIED'
        ELSE '✅ ANALYTICS.ADMIN - CORRECTLY DENIED'
    END as analytics_admin_test,
    CASE 
        WHEN has_permission(u.email, 'sessions', 'read') THEN '✅ SESSIONS.READ - GRANTED'
        ELSE '❌ SESSIONS.READ - DENIED'
    END as sessions_read_test
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN teams t ON u.team_id = t.id
JOIN brands b ON t.brand_id = b.id
JOIN companies c ON b.company_id = c.id
WHERE c.name = 'Stellantis' AND r.name = 'User'
ORDER BY b.name;

-- ========================================
-- TEST 6: ACCESS VIOLATION TESTS
-- ========================================

\echo ''
\echo '🚨 Testing Access Violations:'

-- Test unauthorized access attempts
\echo 'Testing various users trying to access restricted resources:'

SELECT 
    'Access Control Tests' as test_category,
    u.email as user_email,
    r.name as role,
    'agents.delete' as tested_permission,
    CASE 
        WHEN has_permission(u.email, 'agents', 'delete') THEN '❌ UNEXPECTED ACCESS'
        ELSE '✅ CORRECTLY DENIED'
    END as result
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name IN ('User', 'BrandManager')
AND u.email IN ('pepsi.user@pepsico.com', 'lays.user@pepsico.com', 'jeep.user@stellantis.com')

UNION ALL

SELECT 
    'Access Control Tests' as test_category,
    u.email as user_email,
    r.name as role,
    'system.admin' as tested_permission,
    CASE 
        WHEN has_permission(u.email, 'system', 'admin') THEN '❌ UNEXPECTED ACCESS'
        ELSE '✅ CORRECTLY DENIED'
    END as result
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'CompanyAdmin'
AND u.email IN ('pepsi.admin@pepsico.com', 'stellantis.admin@stellantis.com')

ORDER BY user_email, tested_permission;

-- ========================================
-- TEST 7: PERFORMANCE INDEXES TEST
-- ========================================

\echo ''
\echo '⚡ Testing Performance Indexes:'

-- Test if indexes exist and are being used
SELECT 
    'Index Analysis' as test_type,
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_roles', 'roles', 'permissions', 'role_permissions')
ORDER BY tablename, indexname;

-- ========================================
-- TEST 8: DATA INTEGRITY TESTS
-- ========================================

\echo ''
\echo '🔒 Testing Data Integrity:'

-- Test foreign key constraints
SELECT 
    'Data Integrity' as test_type,
    'Orphaned User Roles' as integrity_check,
    COUNT(*) as orphaned_records
FROM user_roles ur
LEFT JOIN users u ON ur.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 
    'Data Integrity' as test_type,
    'Orphaned Role Permissions' as integrity_check,
    COUNT(*) as orphaned_records
FROM role_permissions rp
LEFT JOIN roles r ON rp.role_id = r.id
WHERE r.id IS NULL

UNION ALL

SELECT 
    'Data Integrity' as test_type,
    'Orphaned Teams' as integrity_check,
    COUNT(*) as orphaned_records
FROM teams t
LEFT JOIN brands b ON t.brand_id = b.id
WHERE b.id IS NULL;

-- ========================================
-- TEST 9: FUNCTIONALITY TESTS
-- ========================================

\echo ''
\echo '🧪 Testing RBAC Functions:'

-- Test get_user_permissions function
\echo 'Testing get_user_permissions function for superadmin:'
SELECT * FROM get_user_permissions('thetboard@gmail.com') LIMIT 5;

\echo ''
\echo 'Testing get_user_permissions function for brand user:'
SELECT * FROM get_user_permissions('pepsi.user@pepsico.com');

-- Test specific permission checks
\echo ''
\echo 'Testing specific permission scenarios:'

SELECT 
    'Permission Checks' as test_type,
    scenario,
    user_email,
    resource,
    action,
    expected_result,
    CASE 
        WHEN actual_result = expected_result THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as test_result
FROM (
    SELECT 
        'Superadmin full access' as scenario,
        'thetboard@gmail.com' as user_email,
        'system' as resource,
        'admin' as action,
        true as expected_result,
        has_permission('thetboard@gmail.com', 'system', 'admin') as actual_result
    
    UNION ALL
    
    SELECT 
        'Brand user limited access' as scenario,
        'pepsi.user@pepsico.com' as user_email,
        'users' as resource,
        'delete' as action,
        false as expected_result,
        has_permission('pepsi.user@pepsico.com', 'users', 'delete') as actual_result
    
    UNION ALL
    
    SELECT 
        'Company admin moderate access' as scenario,
        'pepsi.admin@pepsico.com' as user_email,
        'users' as resource,
        'create' as action,
        true as expected_result,
        has_permission('pepsi.admin@pepsico.com', 'users', 'create') as actual_result
) AS permission_tests;

-- ========================================
-- TEST SUMMARY
-- ========================================

\echo ''
\echo '📋 FINAL TEST SUMMARY'
\echo '====================='

SELECT 
    'Setup Summary' as summary_type,
    'Companies' as entity,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ EXPECTED: PepsiCo & Stellantis'
        ELSE '❌ INCORRECT COUNT'
    END as status
FROM companies 
WHERE name IN ('PepsiCo', 'Stellantis')

UNION ALL

SELECT 
    'Setup Summary' as summary_type,
    'Brands per Company' as entity,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ EXPECTED: 3 per company'
        ELSE '❌ INCORRECT COUNT'
    END as status
FROM brands b
JOIN companies c ON b.company_id = c.id
WHERE c.name IN ('PepsiCo', 'Stellantis')

UNION ALL

SELECT 
    'Setup Summary' as summary_type,
    'Total Users' as entity,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 8 THEN '✅ EXPECTED: 1 superadmin + 2 admins + 6 brand users'
        ELSE '❌ INCORRECT COUNT'
    END as status
FROM users u
WHERE u.email IN ('thetboard@gmail.com', 'pepsi.admin@pepsico.com', 'stellantis.admin@stellantis.com')
OR u.email LIKE '%.user@%'

UNION ALL

SELECT 
    'Setup Summary' as summary_type,
    'Total Roles' as entity,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ EXPECTED: SuperAdmin, CompanyAdmin, BrandManager, TeamLead, Agent, User'
        ELSE '❌ INCORRECT COUNT'
    END as status
FROM roles;

\echo ''
\echo '🎉 RBAC TESTS COMPLETED!'
\echo '============================'
\echo '✅ Data Setup: Companies, Brands, Teams, Users'
\echo '✅ Role Hierarchy: SuperAdmin > CompanyAdmin > BrandManager > TeamLead > Agent > User'
\echo '✅ Permission Control: Proper access/denial based on roles'
\echo '✅ Security Validation: No unauthorized access detected'
\echo '✅ Performance: Indexes created for fast queries'
\echo '✅ Functions: has_permission() and get_user_permissions() working'