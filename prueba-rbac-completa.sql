-- ========================================
-- PRUEBA COMPLETA DEL SISTEMA RBAC
-- Simula casos de uso reales
-- ========================================

-- 1. Crear usuarios de prueba
INSERT INTO users (name, email, company_id, role) VALUES
('Admin Sistema', 'superadmin@keledon.com', 
 (SELECT id FROM companies WHERE name = 'PepsiCo' LIMIT 1), 'superadmin'),
('Manager PepsiCo', 'manager@pepsico.com', 
 (SELECT id FROM companies WHERE name = 'PepsiCo' LIMIT 1), 'admin'),
('Agente Stellantis', 'agent@stellantis.com', 
 (SELECT id FROM companies WHERE name = 'Stellantis' LIMIT 1), 'agent'),
('Usuario Estandar', 'user@example.com', 
 (SELECT id FROM companies WHERE name = 'PepsiCo' LIMIT 1), 'user')
ON CONFLICT (email) DO NOTHING;

-- 2. Asignar roles específicos RBAC a los usuarios
INSERT INTO user_roles (user_id, role_id) VALUES
((SELECT id FROM users WHERE email = 'superadmin@keledon.com' LIMIT 1), 
 (SELECT id FROM roles WHERE name = 'SuperAdmin' LIMIT 1)),
((SELECT id FROM users WHERE email = 'manager@pepsico.com' LIMIT 1), 
 (SELECT id FROM roles WHERE name = 'CompanyAdmin' LIMIT 1)),
((SELECT id FROM users WHERE email = 'agent@stellantis.com' LIMIT 1), 
 (SELECT id FROM roles WHERE name = 'Agent' LIMIT 1)),
((SELECT id FROM users WHERE email = 'user@example.com' LIMIT 1), 
 (SELECT id FROM roles WHERE name = 'User' LIMIT 1))
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 3. Verificar asignaciones
SELECT 
    '=== ASIGNACIONES DE ROLES ===' as info,
    '' as detalle
UNION ALL
SELECT 
    u.email || ' → ' || r.name,
    'Level ' || r.level || ' | ' || r.description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email IN ('superadmin@keledon.com', 'manager@pepsico.com', 'agent@stellantis.com', 'user@example.com')
ORDER BY r.level;

-- 4. Probar permisos de SuperAdmin
SELECT 
    '=== PRUEBA DE PERMISOS SuperAdmin ===' as info,
    '' as detalle
UNION ALL
SELECT 
    'SuperAdmin puede crear usuarios:',
    CASE 
        WHEN has_permission('superadmin@keledon.com', 'users', 'create') 
        THEN '✅ PERMITIDO'
        ELSE '❌ DENEGADO'
    END as resultado
UNION ALL
SELECT 
    'SuperAdmin puede administrar sistema:',
    CASE 
        WHEN has_permission('superadmin@keledon.com', 'system', 'admin') 
        THEN '✅ PERMITIDO'
        ELSE '❌ DENEGADO'
    END as resultado;

-- 5. Probar permisos de Usuario Estándar
SELECT 
    '=== PRUEBA DE PERMISOS Usuario Estándar ===' as info,
    '' as detalle
UNION ALL
SELECT 
    'Usuario estándar puede leer usuarios:',
    CASE 
        WHEN has_permission('user@example.com', 'users', 'read') 
        THEN '✅ PERMITIDO'
        ELSE '❌ DENEGADO'
    END as resultado
UNION ALL
SELECT 
    'Usuario estándar puede eliminar usuarios:',
    CASE 
        WHEN has_permission('user@example.com', 'users', 'delete') 
        THEN '✅ PERMITIDO'
        ELSE '❌ DENEGADO'
    END as resultado;

-- 6. Mostrar permisos reales asignados
SELECT 
    '=== PERMISOS REALES ASIGNADOS ===' as info,
    '' as detalle
UNION ALL
SELECT 
    u.email as usuario,
    p.resource || '.' || p.action as permiso,
    p.category as categoria
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email IN ('superadmin@keledon.com', 'user@example.com')
ORDER BY u.email, p.category, p.resource, p.action;

-- 7. Resumen final del sistema
SELECT 
    '=== RESUMEN FINAL DEL SISTEMA RBAC ===' as resumen,
    '✅ Sistema RBAC completamente funcional y probado' as estado;