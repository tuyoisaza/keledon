-- PASO 5 ALTERNATIVO: Verificar estructura exacta de la tabla roles
SELECT 
    'ESTRUCTURA TABLA ROLES' as paso,
    '' as detalle
UNION ALL
SELECT 
    'Columnas en roles:',
    ''
UNION ALL
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'roles' 
AND table_schema = 'public'
ORDER BY ordinal_position;