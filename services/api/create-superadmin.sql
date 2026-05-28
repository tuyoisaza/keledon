-- Create Superadmin User for Google OAuth
-- Run this script after applying the main schema updates

-- First, check if there are any existing users from auth.users
SELECT 'Checking for existing auth users...' as status;

-- Create a temporary function to sync existing auth users to our users table
CREATE OR REPLACE FUNCTION sync_auth_users()
RETURNS void AS $$
DECLARE
    auth_user RECORD;
BEGIN
    FOR auth_user IN SELECT id, email, raw_user_meta_data FROM auth.users WHERE email IS NOT NULL LOOP
        INSERT INTO users (id, email, name, role, created_at, updated_at)
        VALUES (
            auth_user.id,
            auth_user.email,
            COALESCE(auth_user.raw_user_meta_data->>'full_name', 'User'),
            'user',  -- Default role
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            last_login = NOW(),
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Sync existing users
SELECT sync_auth_users();

-- Update specific user to superadmin (replace with your actual email)
UPDATE users 
SET role = 'superadmin', updated_at = NOW() 
WHERE email = 'your-superadmin-email@example.com';

-- If you don't know the email yet, you can list all users:
SELECT 'All users in the system:' as info;
SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC;

-- Create improved trigger function for future users
CREATE OR REPLACE FUNCTION create_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        CASE 
            WHEN NEW.email = 'your-superadmin-email@example.com' THEN 'superadmin'
            ELSE 'user'
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_from_auth();

-- Verification queries
SELECT 'Superadmin user setup completed!' as message;
SELECT * FROM users WHERE role = 'superadmin';

-- Instructions
SELECT 'Instructions:' as info;
SELECT '1. If you need to update the superadmin email, run:' as step1;
SELECT '   UPDATE users SET role = "superadmin" WHERE email = "your-email@example.com";' as command;
SELECT '2. Or manually set roles in Supabase Dashboard > Table Editor > users table' as step2;