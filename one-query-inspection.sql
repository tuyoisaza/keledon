-- ONE-QUERY DATABASE ASSESSMENT
-- Run this and share the complete output
SELECT 
    '=== CURRENT TABLES ===' as info,
    '' as details
UNION ALL
SELECT 
    table_name,
    'Rows: ' || (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_name = t.table_name)
FROM information_schema.tables t 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    '=== RBAC TABLE RECORD COUNTS ===' as info,
    '' as details
UNION ALL
SELECT 
    'users',
    COALESCE((SELECT COUNT(*)::text FROM users), '0')
UNION ALL  
SELECT 
    'companies',
    COALESCE((SELECT COUNT(*)::text FROM companies), '0')
UNION ALL
SELECT 
    'roles', 
    COALESCE((SELECT COUNT(*)::text FROM roles), '0')
UNION ALL
SELECT 
    'permissions',
    COALESCE((SELECT COUNT(*)::text FROM permissions), '0')
UNION ALL
SELECT 
    'user_roles',
    COALESCE((SELECT COUNT(*)::text FROM user_roles), '0')
UNION ALL
SELECT 
    'role_permissions',
    COALESCE((SELECT COUNT(*)::text FROM role_permissions), '0')
UNION ALL
SELECT 
    '=== FIRST 5 PERMISSIONS ===' as info,
    '' as details
UNION ALL
SELECT 
    name,
    resource || '.' || action || ' (' || category || ')'
FROM permissions 
ORDER BY category, resource, action
LIMIT 5
UNION ALL
SELECT 
    '=== ALL ROLES ===' as info,
    '' as details  
UNION ALL
SELECT 
    name,
    'Level ' || level || ' | System: ' || is_system_role::text
FROM roles 
ORDER BY level;