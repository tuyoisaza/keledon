-- PASO 5: Verificar qué roles existen
SELECT 
    'ROLES EXISTENTES' as paso,
    '' as detalle
UNION ALL
SELECT 
    'Todos los roles:',
    ''
UNION ALL
SELECT 
    name,
    'Level ' || level || ' | System: ' || is_system_role::text
FROM roles 
ORDER BY level;