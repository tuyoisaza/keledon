-- PASO 4: Verificar qué permisos y roles ya existen (CORREGIDO)
SELECT 
    'PERMISOS EXISTENTES' as paso,
    '' as detalle
UNION ALL
SELECT 
    'Primeros 10 permisos:',
    ''
UNION ALL
SELECT 
    name,
    category
FROM permissions 
LIMIT 10;