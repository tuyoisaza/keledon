-- Ensure browser-facing Supabase roles cannot bypass the API's DB-derived tenant scope.
-- With RLS enabled and no row policy, anon/authenticated access is denied by default.
-- The server-side Prisma connection remains responsible for authorized application work.
DO $$
DECLARE
  table_row record;
  policy_row record;
BEGIN
  FOR table_row IN
    SELECT n.nspname AS schemaname, c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.classid = 'pg_class'::regclass
          AND d.objid = c.oid
          AND d.refclassid = 'pg_extension'::regclass
          AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', table_row.schemaname, table_row.tablename);
  END LOOP;

  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname LIKE 'Allow all for %'
        OR policyname IN (
          'Enable read access for authenticated users',
          'Enable all access for superadmins'
        )
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  END LOOP;
END;
$$;
