#!/bin/bash

# Apply Schema Updates for Superadmin Google OAuth Fix
# This script applies the database schema changes needed for Google OAuth superadmin recognition

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Applying Schema Updates for Google OAuth Superadmin Fix${NC}"

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is required but not installed.${NC}"
    echo "Please install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Load Supabase configuration from cloud/.env
ENV_FILE="cloud/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ cloud/.env file not found.${NC}"
    exit 1
fi

source "$ENV_FILE"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in cloud/.env${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Applying schema updates...${NC}"

# Apply the schema changes
supabase db push --db-url "$SUPABASE_URL" --db-password "$SUPABASE_SERVICE_KEY" || {
    echo -e "${RED}❌ Failed to apply schema changes via db push${NC}"
    echo -e "${YELLOW}⚠️  Trying manual SQL execution...${NC}"
    
    # Alternative: Execute SQL directly
    psql "$SUPABASE_URL" << 'EOF'
-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin', 'coordinator', 'superadmin')),
    is_online BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all for users" ON users;
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);

-- Update agents table to include missing fields
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS calls_handled INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS fcr_rate FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_handle_time INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS autonomy_level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS policies JSONB DEFAULT '{}';

-- Create trigger function for auto user creation
CREATE OR REPLACE FUNCTION create_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        'user',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        updated_at = NOW()
    WHERE users.id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_from_auth();

SELECT 'Schema updates applied successfully!' as message;
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Schema updates applied successfully via SQL!${NC}"
    else
        echo -e "${RED}❌ Failed to apply schema updates${NC}"
        exit 1
    fi
}

echo -e "${GREEN}✅ Schema updates completed!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Create a superadmin user by running:"
echo "   - Update the email in cloud/create-superadmin.sql"
echo "   - Execute: psql \$SUPABASE_URL < cloud/create-superadmin.sql"
echo ""
echo "2. Or manually update a user's role in the Supabase dashboard:"
echo "   - Go to Authentication > Users"
echo "   - Find your Google OAuth user"
echo "   - Note their ID and update their role to 'superadmin' in the users table"
echo ""