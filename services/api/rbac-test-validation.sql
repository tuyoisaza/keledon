-- Retired legacy RBAC validation against named customer-like accounts.
DO $$
BEGIN
  RAISE EXCEPTION 'rbac-test-validation.sql is retired; use isolated synthetic regression fixtures';
END;
$$;
