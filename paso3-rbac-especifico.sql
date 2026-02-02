-- PASO 3: Verificar tablas RBAC específicas y sus registros
SELECT 
    'ESTADO ESPECÍFICO RBAC' as paso,
    '' as detalle
UNION ALL
SELECT 
    'Tabla users - Registros:',
    (SELECT COUNT(*)::text FROM users)
UNION ALL
SELECT 
    'Tabla companies - Registros:',
    (SELECT COUNT(*)::text FROM companies)
UNION ALL
SELECT 
    'Tabla roles - Registros:',
    (SELECT COUNT(*)::text FROM roles)
UNION ALL
SELECT 
    'Tabla permissions - Registros:',
    (SELECT COUNT(*)::text FROM permissions)
UNION ALL
SELECT 
    'Tabla user_roles - Registros:',
    (SELECT COUNT(*)::text FROM user_roles)
UNION ALL
SELECT 
    'Tabla role_permissions - Registros:',
    (SELECT COUNT(*)::text FROM role_permissions);