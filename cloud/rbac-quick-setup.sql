-- Retired legacy RBAC quick setup.
-- It created permissive legacy tables and depended on customer-like sample data.
DO $$
BEGIN
  RAISE EXCEPTION 'rbac-quick-setup.sql is retired; use reviewed migrations and the current API authorization model';
END;
$$;
