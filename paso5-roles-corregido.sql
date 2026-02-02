-- PASO 5: Verificar qué roles existen (CORREGIDO)
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
    'Level ' || CAST(level AS TEXT) || ' | System: ' || CAST(is_system_role AS TEXT)
FROM roles;