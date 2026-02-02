-- PASO 2: Verificar qué tablas RBAC existen y cuántos registros tienen
SELECT 
    'CONTEO TABLAS RBAC' as paso,
    '' as detalle
UNION ALL
SELECT 
    'users:',
    COALESCE((SELECT COUNT(*)::text FROM users), 'NO EXISTE')
UNION ALL
SELECT 
    'companies:',
    COALESCE((SELECT COUNT(*)::text FROM companies), 'NO EXISTE')
UNION ALL
SELECT 
    'roles:',
    COALESCE((SELECT COUNT(*)::text FROM roles), 'NO EXISTE')
UNION ALL
SELECT 
    'permissions:',
    COALESCE((SELECT COUNT(*)::text FROM permissions), 'NO EXISTE')
UNION ALL
SELECT 
    'user_roles:',
    COALESCE((SELECT COUNT(*)::text FROM user_roles), 'NO EXISTE')
UNION ALL
SELECT 
    'role_permissions:',
    COALESCE((SELECT COUNT(*)::text FROM role_permissions), 'NO EXISTE');