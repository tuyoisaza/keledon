-- Retired legacy role bootstrap.
-- Elevated roles are assigned only by an authenticated current superadmin.
DO $$
BEGIN
  RAISE EXCEPTION 'provision_superadmin.sql is retired; use the authenticated superadmin role-management API';
END;
$$;
