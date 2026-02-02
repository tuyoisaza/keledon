-- ========================================
-- SCRIPT DE DIAGNÓSTICO Y REPARACIÓN RBAC
-- Para Supabase - Ejecutar en orden
-- ========================================

-- PRIMERO: Verificar estado actual
SELECT '=== DIAGNOSTICO ACTUAL ===' as info;

-- Tablas que existen
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Registros en tablas RBAC (si existen)
SELECT 
    'users' as tabla,
    COALESCE(CAST(COUNT(*) AS TEXT), 'NO EXISTE') as registros
FROM users
UNION ALL
SELECT 
    'companies' as tabla,
    COALESCE(CAST(COUNT(*) AS TEXT), 'NO EXISTE') as registros
FROM companies
UNION ALL
SELECT 
    'roles' as tabla,
    COALESCE(CAST(COUNT(*) AS TEXT), 'NO EXISTE') as registros
FROM roles
UNION ALL
SELECT 
    'permissions' as tabla,
    COALESCE(CAST(COUNT(*) AS TEXT), 'NO EXISTE') as registros
FROM permissions
UNION ALL
SELECT 
    'user_roles' as tabla,
    COALESCE(CAST(COUNT(*) AS TEXT), 'NO EXISTE') as registros
FROM user_roles
UNION ALL
SELECT 
    'role_permissions' as tabla,
    COALESCE(CAST(COUNT(*) AS TEXT), 'NO EXISTE') as registros
FROM role_permissions;