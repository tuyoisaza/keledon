-- Retired legacy sample-data setup.
-- The previous script provisioned named customer tenants and elevated test users.
-- Use reviewed schema migrations for structure and the authenticated API for roles.
DO $$
BEGIN
  RAISE EXCEPTION 'rbac-complete-setup.sql is retired; it must not seed customer accounts or assign elevated roles';
END;
$$;
