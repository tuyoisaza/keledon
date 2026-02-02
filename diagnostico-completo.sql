-- ========================================
-- DIAGNÓSTICO COMPLETO DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- 1. Verificar todas las tablas existentes
SELECT 
    '=== TABLAS EXISTENTES ===' as section,
    '' as table_info
UNION ALL
SELECT 
    table_name,
    CASE 
        WHEN table_type = 'BASE TABLE' THEN 'Base Table'
        WHEN table_type = 'VIEW' THEN 'View'
        ELSE table_type
    END as table_info
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verificar estructura de tablas específicas
SELECT 
    '=== DETALLE DE TABLAS RBAC ===' as section,
    '' as table_info
UNION ALL
SELECT 
    'users' as table_name,
    COALESCE('Columns: ' || (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_name = 'users'), 'No columns found')
UNION ALL
SELECT 
    'companies' as table_name,
    COALESCE('Columns: ' || (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_name = 'companies'), 'No columns found')
UNION ALL
SELECT 
    'roles' as table_name,
    COALESCE('Columns: ' || (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_name = 'roles'), 'No columns found')
UNION ALL
SELECT 
    'permissions' as table_name,
    COALESCE('Columns: ' || (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_name = 'permissions'), 'No columns found')
UNION ALL
SELECT 
    'user_roles' as table_name,
    COALESCE('Columns: ' || (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_name = 'user_roles'), 'No columns found')
UNION ALL
SELECT 
    'role_permissions' as table_name,
    COALESCE('Columns: ' || (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_name = 'role_permissions'), 'No columns found');

-- 3. Verificar conteo exacto de registros
SELECT 
    '=== CONTEO DE REGISTROS ===' as section,
    '' as table_info
UNION ALL
SELECT 
    'users' as table_name,
    COALESCE(CAST(COUNT(*) AS TEXT), '0') as record_count
FROM users
UNION ALL
SELECT 
    'companies' as table_name,
    COALESCE(CAST(COUNT(*) AS TEXT), '0') as record_count
FROM companies
UNION ALL
SELECT 
    'roles' as table_name,
    COALESCE(CAST(COUNT(*) AS TEXT), '0') as record_count
FROM roles
UNION ALL
SELECT 
    'permissions' as table_name,
    COALESCE(CAST(COUNT(*) AS TEXT), '0') as record_count
FROM permissions
UNION ALL
SELECT 
    'user_roles' as table_name,
    COALESCE(CAST(COUNT(*) AS TEXT), '0') as record_count
FROM user_roles
UNION ALL
SELECT 
    'role_permissions' as table_name,
    COALESCE(CAST(COUNT(*) AS TEXT), '0') as record_count
FROM role_permissions;

-- 4. Verificar si hay funciones existentes
SELECT 
    '=== FUNCIONES EXISTENTES ===' as section,
    '' as table_info
UNION ALL
SELECT 
    routine_name,
    'Function - ' || COALESCE(routine_type, 'Unknown') as table_info
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%permission%'
ORDER BY routine_name;

-- 5. Verificar si hay vistas existentes
SELECT 
    '=== VISTAS EXISTENTES ===' as section,
    '' as table_info
UNION ALL
SELECT 
    table_name,
    'View - Columns: ' || (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_name = v.table_name) as table_info
FROM information_schema.views v 
WHERE table_schema = 'public' 
ORDER BY table_name;