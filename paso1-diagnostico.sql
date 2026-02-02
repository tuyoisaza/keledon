-- PASO 1: Verificar estado actual de la base de datos
SELECT 
    'DIAGNOSTICO ACTUAL' as paso,
    '' as detalle
UNION ALL
SELECT 
    'Tablas existentes:',
    COUNT(*)::text
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';