const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from cloud/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createUsers() {
    try {
        console.log('🚀 Starting User Creation script...');

        // 1. Create Company 'TestCo'
        let { data: company, error: findCompanyError } = await supabase
            .from('companies')
            .select()
            .eq('name', 'TestCo')
            .maybeSingle();

        if (!company) {
            const { data: newCompany, error: createCompanyError } = await supabase
                .from('companies')
                .insert({ name: 'TestCo', industry: 'Testing' })
                .select()
                .single();
            if (createCompanyError) throw createCompanyError;
            company = newCompany;
        }
        console.log(`✅ Company 'TestCo' ready: ${company.id}`);

        // 2. Create Brand 'testbrand'
        let { data: brand, error: findBrandError } = await supabase
            .from('brands')
            .select()
            .eq('name', 'testbrand')
            .maybeSingle();

        if (!brand) {
            const { data: newBrand, error: createBrandError } = await supabase
                .from('brands')
                .insert({ company_id: company.id, name: 'testbrand' })
                .select()
                .single();
            if (createBrandError) throw createBrandError;
            brand = newBrand;
        }
        console.log(`✅ Brand 'testbrand' ready: ${brand.id}`);

        // 3. Create Team 'Default Team'
        let { data: team, error: findTeamError } = await supabase
            .from('teams')
            .select()
            .eq('name', 'Default Team')
            .maybeSingle();

        if (!team) {
            const { data: newTeam, error: createTeamError } = await supabase
                .from('teams')
                .insert({ brand_id: brand.id, name: 'Default Team' })
                .select()
                .single();
            if (createTeamError) throw createTeamError;
            team = newTeam;
        }
        console.log(`✅ Team 'Default Team' ready: ${team.id}`);

        const usersToCreate = [
            {
                email: 'test@test.com',
                password: '123123',
                name: 'Test User',
                role: 'user'
            },
            {
                email: 'admin@test.com',
                password: 'asdasd',
                name: 'Admin User',
                role: 'admin'
            }
        ];

        for (const userData of usersToCreate) {
            console.log(`\n👤 Processing user: ${userData.email}...`);

            // a. Create in Auth
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: { full_name: userData.name }
            });

            if (authError) {
                if (authError.message.includes('already exists')) {
                    console.log(`ℹ️ User already exists in Auth.`);
                } else {
                    console.error(`❌ Auth Error: ${authError.message}`);
                    continue;
                }
            } else {
                console.log(`✅ User created in Auth: ${authUser.user.id}`);
            }

            // Get the user ID (either from create result or by listing)
            let userId;
            if (authUser?.user) {
                userId = authUser.user.id;
            } else {
                const { data: list, error: listError } = await supabase.auth.admin.listUsers();
                if (listError) {
                    console.error(`❌ List Error: ${listError.message}`);
                    continue;
                }
                const existing = list.users.find(u => u.email === userData.email);
                if (existing) userId = existing.id;
            }

            // b. Sync to public.users
            const { error: syncError } = await supabase
                .from('users')
                .upsert({
                    id: userId,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    company_id: company.id,
                    team_id: team.id
                }, { onConflict: 'email' });

            if (syncError) {
                console.error(`❌ Sync Error: ${syncError.message}`);
            } else {
                console.log(`✅ User synced to public.users table with role: ${userData.role}`);
            }
        }

        console.log('\n🎉 Finished creating users!');

    } catch (err) {
        console.error('❌ Critical Error:', err.message);
    }
}

createUsers();
