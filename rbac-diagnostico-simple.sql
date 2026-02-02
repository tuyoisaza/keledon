-- ========================================
-- RBAC SETUP SIMPLIFICADO Y ROBUSTO
-- Ejecutar paso a paso si hay errores
-- ========================================

-- COMPROBACIÓN 1: Verificar tablas existentes
SELECT 'Verificando tablas existentes...' as status;

-- COMPROBACIÓN 2: Tablas que deberían existir
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'users', 'roles', 'permissions', 'user_roles', 'role_permissions')
ORDER BY table_name;

-- COMPROBACIÓN 3: Conteos actuales
SELECT 
    'conteo_actual' as tipo,
    table_name,
    COALESCE(record_count, 0) as cantidad
FROM (
    SELECT 'companies' as table_name, (SELECT COUNT(*) FROM companies) as record_count
    UNION ALL SELECT 'users' as table_name, (SELECT COUNT(*) FROM users) as record_count  
    UNION ALL SELECT 'roles' as table_name, (SELECT COUNT(*) FROM roles) as record_count
    UNION ALL SELECT 'permissions' as table_name, (SELECT COUNT(*) FROM permissions) as record_count
    UNION ALL SELECT 'user_roles' as table_name, (SELECT COUNT(*) FROM user_roles) as record_count
    UNION ALL SELECT 'role_permissions' as table_name, (SELECT COUNT(*) FROM role_permissions) as record_count
) as conteos
ORDER BY table_name;