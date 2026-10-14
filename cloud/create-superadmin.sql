-- Retired legacy superadmin bootstrap.
-- New Auth accounts default to user; an existing authenticated superadmin assigns elevated roles.
DO $$
BEGIN
  RAISE EXCEPTION 'create-superadmin.sql is retired; it must not elevate accounts by email or SQL seed';
END;
$$;
