-- QUICK INSPECTION - Run each command separately
-- Copy all results and share with me

-- Command 1: All tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Command 2: Permission duplicates that caused error
SELECT name, resource, action FROM permissions WHERE name LIKE 'users.%';

-- Command 3: Existing roles
SELECT name, level, is_system_role FROM roles ORDER BY level;