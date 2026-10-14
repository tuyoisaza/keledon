-- Retired legacy customer-like fixture data.
-- The former PepsiCo/Stellantis sample could contaminate a real tenant database.
DO $$
BEGIN
  RAISE EXCEPTION 'rbac-test-data-setup.sql is retired; use isolated synthetic test fixtures';
END;
$$;
