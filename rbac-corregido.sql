-- ========================================
-- RBAC SETUP - VERSIÓN CORREGIDA
-- Sin errores de SQL syntax
-- ========================================

-- Paso 1: Verificar estado actual
SELECT '=== DIAGNOSTICO INICIAL ===' as section;

-- Tablas existentes (sin conflicto de alias)
SELECT table_name as tablas_existentes
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Paso 2: Conteo actual de registros
SELECT '=== CONTEO DE REGISTROS ===' as section;

SELECT 
    'users' as nombre_tabla,
    COALESCE((SELECT COUNT(*)::text FROM users), 'NO EXISTE') as cantidad_registros
UNION ALL
SELECT 
    'companies' as nombre_tabla,
    COALESCE((SELECT COUNT(*)::text FROM companies), 'NO EXISTE') as cantidad_registros
UNION ALL
SELECT 
    'roles' as nombre_tabla,
    COALESCE((SELECT COUNT(*)::text FROM roles), 'NO EXISTE') as cantidad_registros
UNION ALL
SELECT 
    'permissions' as nombre_tabla,
    COALESCE((SELECT COUNT(*)::text FROM permissions), 'NO EXISTE') as cantidad_registros
UNION ALL
SELECT 
    'user_roles' as nombre_tabla,
    COALESCE((SELECT COUNT(*)::text FROM user_roles), 'NO EXISTE') as cantidad_registros
UNION ALL
SELECT 
    'role_permissions' as nombre_tabla,
    COALESCE((SELECT COUNT(*)::text FROM role_permissions), 'NO EXISTE') as cantidad_registros;