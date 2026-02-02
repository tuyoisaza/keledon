-- PASO 4: Verificar qué permisos y roles ya existen
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
ORDER BY category, name
LIMIT 10;