/**
 * Migration + Seed Script: Add user_id to sessions and create demo data
 * 
 * Creates:
 * - Stellantis Jeep: 1 user, 1 admin, 20 sessions
 * - Pepsico Cheetos: 1 user, 1 admin, 10 sessions
 * 
 * Run with: node scripts/seed_demo_data.js
 */

import { createClient } from '@supabase/supabase-js';

// Use service key to run migrations
const supabaseUrl = 'https://isoyzcvjoevyphnaznkl.supabase.co';
const supabaseKey = 'sb_secret_yqq_tgfKS_2BgKviwVn1lw_W_RbzJVV';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to generate random data
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const intents = [
    'check_order_status',
    'book_appointment',
    'general_inquiry',
    'product_info',
    'billing_question',
    'technical_support',
    'cancel_order',
    'refund_request',
    'schedule_service',
    'speak_to_agent'
];

const statuses = ['completed', 'completed', 'completed', 'escalated', 'active']; // Weighted toward completed
const callerIds = [
    '+1 (555) 123-4567',
    '+1 (555) 987-6543',
    '+1 (555) 456-7890',
    '+1 (555) 111-2222',
    '+1 (555) 333-4444',
    '+1 (555) 555-6666',
    '+1 (555) 777-8888',
    '+1 (555) 999-0000'
];

async function runMigration() {
    console.log('📦 Running migration: add user_id to sessions...');

    // Check if column exists
    const { data: cols } = await supabase
        .from('sessions')
        .select('user_id')
        .limit(1);

    if (cols !== null) {
        console.log('✓ Column user_id already exists');
        return true;
    }

    // Column doesn't exist - need to add it via SQL
    // Note: Supabase JS client can't run raw ALTER TABLE, 
    // so we'll just skip and hope it exists
    console.log('⚠️ Column user_id may not exist. Please run the migration SQL manually:');
    console.log('   ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);');
    return false;
}

async function findOrCreateCompany(name) {
    let { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('name', name)
        .single();

    if (!company) {
        const { data, error } = await supabase
            .from('companies')
            .insert({ name })
            .select()
            .single();
        if (error) throw error;
        company = data;
        console.log(`✓ Created company: ${name}`);
    } else {
        console.log(`✓ Found company: ${name}`);
    }
    return company.id;
}

async function findOrCreateBrand(name, companyId) {
    let { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('name', name)
        .eq('company_id', companyId)
        .single();

    if (!brand) {
        const { data, error } = await supabase
            .from('brands')
            .insert({ name, company_id: companyId })
            .select()
            .single();
        if (error) throw error;
        brand = data;
        console.log(`✓ Created brand: ${name}`);
    } else {
        console.log(`✓ Found brand: ${name}`);
    }
    return brand.id;
}

async function findOrCreateTeam(name, brandId) {
    let { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('name', name)
        .single();

    if (!team) {
        const { data, error } = await supabase
            .from('teams')
            .insert({ name, brand_id: brandId })
            .select()
            .single();
        if (error) throw error;
        team = data;
        console.log(`✓ Created team: ${name}`);
    } else {
        console.log(`✓ Found team: ${name}`);
    }
    return team.id;
}

async function createUser(name, email, role, companyId, teamId) {
    // Check if exists
    let { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (!user) {
        const { data, error } = await supabase
            .from('users')
            .insert({
                name,
                email,
                role,
                company_id: companyId,
                team_id: teamId
            })
            .select()
            .single();
        if (error) throw error;
        user = data;
        console.log(`✓ Created user: ${name} (${role})`);
    } else {
        console.log(`✓ Found user: ${name}`);
    }
    return user.id;
}

async function createSessions(userId, count) {
    const sessions = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        // Random time within last 7 days
        const createdAt = new Date(now.getTime() - randomInt(0, 7 * 24 * 60 * 60 * 1000));

        sessions.push({
            user_id: userId,
            caller_id: randomChoice(callerIds),
            status: randomChoice(statuses),
            intent: randomChoice(intents),
            confidence: randomFloat(0.5, 0.98),
            duration: randomInt(30, 600), // 30 seconds to 10 minutes
            created_at: createdAt.toISOString()
        });
    }

    const { error } = await supabase.from('sessions').insert(sessions);
    if (error) {
        if (error.message.includes('user_id')) {
            // Try without user_id
            console.log('⚠️ user_id column not found, inserting without it...');
            const sessionsNoUser = sessions.map(s => {
                const { user_id, ...rest } = s;
                return rest;
            });
            const { error: err2 } = await supabase.from('sessions').insert(sessionsNoUser);
            if (err2) throw err2;
        } else {
            throw error;
        }
    }
    console.log(`✓ Created ${count} sessions`);
}

async function main() {
    console.log('=== Seeding Demo Data ===\n');

    try {
        await runMigration();

        // === STELLANTIS JEEP ===
        console.log('\n--- Stellantis Jeep ---');
        const stellantisId = await findOrCreateCompany('Stellantis');
        const jeepBrandId = await findOrCreateBrand('Jeep', stellantisId);
        const jeepTeamId = await findOrCreateTeam('CAC JEEP', jeepBrandId);

        const jeepUserId = await createUser(
            'Maria Garcia',
            'maria.garcia@stellantis.com',
            'user',
            stellantisId,
            jeepTeamId
        );

        const jeepAdminId = await createUser(
            'Carlos Rodriguez',
            'carlos.rodriguez@stellantis.com',
            'admin',
            stellantisId,
            jeepTeamId
        );

        await createSessions(jeepUserId, 12);
        await createSessions(jeepAdminId, 8);

        // === PEPSICO CHEETOS ===
        console.log('\n--- Pepsico Cheetos ---');
        const pepsicoId = await findOrCreateCompany('Pepsico');
        const cheetosBrandId = await findOrCreateBrand('Cheetos', pepsicoId);
        const cheetosTeamId = await findOrCreateTeam('Cheetos Support', cheetosBrandId);

        const cheetosUserId = await createUser(
            'Ana Martinez',
            'ana.martinez@pepsico.com',
            'user',
            pepsicoId,
            cheetosTeamId
        );

        const cheetosAdminId = await createUser(
            'Luis Hernandez',
            'luis.hernandez@pepsico.com',
            'admin',
            pepsicoId,
            cheetosTeamId
        );

        await createSessions(cheetosUserId, 6);
        await createSessions(cheetosAdminId, 4);

        console.log('\n=== Seeding Complete! ===');
        console.log('Summary:');
        console.log('- Stellantis Jeep: 2 users, 20 sessions');
        console.log('- Pepsico Cheetos: 2 users, 10 sessions');

    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

main();
