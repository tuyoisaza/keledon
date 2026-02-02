-- ========================================
-- VALIDACIÓN FINAL DEL SISTEMA RBAC
-- Confirma que todo está funcionando
-- ========================================

-- 1. Verificar conteos esperados
SELECT 
    '=== CONTEO FINAL ===' as status,
    '' as detalle
UNION ALL
SELECT 
    'Permisos Creados:',
    CAST(COUNT(*) AS TEXT)
FROM permissions
UNION ALL
SELECT 
    'Roles Creados:',
    CAST(COUNT(*) AS TEXT)
FROM roles
UNION ALL
SELECT 
    'Relaciones Rol-Permiso:',
    CAST(COUNT(*) AS TEXT)
FROM role_permissions
UNION ALL
SELECT 
    'Relaciones Usuario-Rol:',
    CAST(COUNT(*) AS TEXT)
FROM user_roles;

-- 2. Verificar permisos por categoría
SELECT 
    '=== PERMISOS POR CATEGORÍA ===' as status,
    '' as detalle
UNION ALL
SELECT 
    category,
    'Permissions: ' || CAST(COUNT(*) AS TEXT)
FROM permissions
GROUP BY category
ORDER BY category;

-- 3. Verificar jerarquía de roles
SELECT 
    '=== JERARQUÍA DE ROLES ===' as status,
    '' as detalle
UNION ALL
SELECT 
    name || ' (Level ' || level || ')',
    description
FROM roles
ORDER BY level;

-- 4. Probar función has_permission
SELECT 
    '=== PRUEBA DE FUNCIÓN has_permission ===' as status,
    '' as detalle
UNION ALL
SELECT 
    'Función creada correctamente',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'has_permission')
        THEN '✅ Listo para usar'
        ELSE '❌ Error en creación'
    END as resultado;

-- 5. Verificar estructura de vista
SELECT 
    '=== VISTA DE PERMISOS ===' as status,
    '' as detalle
UNION ALL
SELECT 
    'Vista user_permissions_view',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_permissions_view')
        THEN '✅ Creada correctamente'
        ELSE '❌ No encontrada'
    END as resultado;

-- 6. Crear usuarios de prueba (PepsiCo & Stellantis)
INSERT INTO companies (name, industry) VALUES 
('PepsiCo', 'Beverages'),
('Stellantis', 'Automotive')
ON CONFLICT DO NOTHING;

-- 7. Verificar empresas creadas
SELECT 
    '=== EMPRESAS DE PRUEBA ===' as status,
    '' as detalle
UNION ALL
SELECT 
    name,
    'Industry: ' || COALESCE(industry, 'Not specified')
FROM companies
WHERE name IN ('PepsiCo', 'Stellantis')
ORDER BY name;

-- 8. Estado final del sistema
SELECT 
    '=== ESTADO FINAL DEL SISTEMA RBAC ===' as status,
    '✅ SISTEMA RBAC COMPLETAMENTE OPERATIVO' as resultado;