-- Provision thetboard@gmail.com as a SuperAdmin
-- Run this in your Supabase SQL Editor

INSERT INTO users (email, name, role) 
VALUES ('thetboard@gmail.com', 'The T Board', 'superadmin')
ON CONFLICT (email) DO UPDATE 
SET role = 'superadmin',
    name = EXCLUDED.name,
    updated_at = NOW();

-- Verification query
SELECT id, email, name, role FROM users WHERE email = 'thetboard@gmail.com';
