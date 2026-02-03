const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.resolve(__dirname, '../cloud/.env');
console.log('Reading .env from:', envPath);
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Could not read .env file');
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1');
    }
});

// Try to load supabase-js from cloud/node_modules if not found globally
let createClient;
try {
    createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
    try {
        createClient = require('../cloud/node_modules/@supabase/supabase-js').createClient;
    } catch (e2) {
        console.error('Could not find @supabase/supabase-js. Please run "npm install" in cloud directory.');
        process.exit(1);
    }
}

const supabaseUrl = envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in cloud/.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Seeding Interfaces...');

    // 1. Ensure Managed Interfaces exist
    const interfaces = [
        { name: 'Genesys Cloud', base_url: 'https://login.mypurecloud.com', status: 'connected', icon: 'headphones' },
        { name: 'Salesforce', base_url: 'https://login.salesforce.com', status: 'connected', icon: 'globe' },
        { name: 'Avaya', base_url: 'https://avaya.com', status: 'disconnected', icon: 'headphones' }
    ];

    const interfaceIds = {};

    for (const iface of interfaces) {
        const { data, error } = await supabase
            .from('managed_interfaces')
            .upsert(iface, { onConflict: 'name' })
            .select()
            .single();

        if (error) {
            console.error(`Error upserting interface ${iface.name}:`, error);
        } else {
            console.log(`Interface ensured: ${iface.name} (${data.id})`);
            interfaceIds[iface.name] = data.id;
        }
    }

    // 2. Find Demo Team (or create)
    let { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', '%Demo%')
        .maybeSingle();

    if (!team) {
        console.log('Demo Team not found, trying general search...');
        const { data: anyTeam } = await supabase.from('teams').select('*').limit(1).single();
        team = anyTeam;
    }

    if (!team) {
        console.error('No teams found to seed against. Please create a team first.');
        return;
    }

    console.log(`Seeding interfaces for team: ${team.name} (${team.id})`);

    // 3. Link Team to Interfaces (Genesys + Salesforce)
    const links = [
        { team_id: team.id, interface_id: interfaceIds['Genesys Cloud'] },
        { team_id: team.id, interface_id: interfaceIds['Salesforce'] }
    ];

    for (const link of links) {
        if (!link.interface_id) continue;

        const { error } = await supabase
            .from('team_interfaces')
            .upsert(link, { onConflict: 'team_id,interface_id' });

        if (error) {
            console.error(`Error linking interface to team:`, error.message);
        } else {
            console.log(`Linked interface ${link.interface_id} to team ${team.id}`);
        }
    }
}

seed().catch(console.error);
