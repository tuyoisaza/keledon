-- Fix: Allow deleting users by cascading delete to sessions
-- Run this in Supabase SQL Editor

-- 1. Drop the existing foreign key constraint
ALTER TABLE sessions 
DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

-- 2. Re-add the constraint with ON DELETE CASCADE
ALTER TABLE sessions
ADD CONSTRAINT sessions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Verify
SELECT
    tc.constraint_name, 
    rc.delete_rule 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.referential_constraints AS rc 
    ON tc.constraint_name = rc.constraint_name 
WHERE 
    tc.table_name = 'sessions' AND 
    tc.constraint_type = 'FOREIGN KEY';
