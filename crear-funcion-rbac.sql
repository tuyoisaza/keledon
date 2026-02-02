-- ========================================
-- CREAR FUNCIÓN has_permission() EN SUPABASE
-- Función de verificación de permisos RBAC
-- ========================================

-- Verificar si la vista user_permissions_view existe
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.name as user_name,
    r.name as role_name,
    r.level as role_level,
    p.name as permission_name,
    p.resource,
    p.action,
    p.category as permission_category
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE ur.is_active = true;

-- Crear función has_permission()
CREATE OR REPLACE FUNCTION has_permission(user_email TEXT, resource TEXT, action TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_permissions_view 
        WHERE email = user_email 
        AND resource = resource 
        AND action = action
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que la función se creó
SELECT 
    'FUNCIÓN has_permission() CREADA' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'has_permission' AND routine_schema = 'public')
        THEN '✅ Función creada exitosamente'
        ELSE '❌ Error al crear función'
    END as resultado;