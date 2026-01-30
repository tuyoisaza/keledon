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
    // Trim and ignore comments
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        // Join the rest in case value has =
        let val = parts.slice(1).join('=').trim();
        // Remove surrounding quotes if present
        val = val.replace(/^["'](.*)["']$/, '$1');
        envVars[key] = val;
    }
});
console.log('Loaded env vars:', Object.keys(envVars));
if (!envVars.SUPABASE_URL) {
    // Fallback to VITE_ prefixed vars if standard ones missing (frontend .env?)
    envVars.SUPABASE_URL = envVars.VITE_SUPABASE_URL;
    envVars.SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;
}


// Try to load supabase-js
let createClient;
try {
    createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
    try {
        createClient = require('../cloud/node_modules/@supabase/supabase-js').createClient;
    } catch (e2) {
        console.error('Could not find @supabase/supabase-js');
        process.exit(1);
    }
}

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_ANON_KEY);

async function seed() {
    console.log('Seeding Real World Data...');

    // 1. Companies
    const companies = [
        { name: 'Stellantis', industry: 'Automotive' },
        { name: 'Pepsico', industry: 'Food & Beverage' }
    ];

    const companyMap = {}; // name -> id

    for (const c of companies) {
        // Find existing first to avoid duplicate errors if constraints are missing
        let { data: existing } = await supabase.from('companies').select('id').eq('name', c.name).maybeSingle();
        if (!existing) {
            const { data, error } = await supabase.from('companies').insert(c).select().single();
            if (error) { console.error('Error creating company', c.name, error); continue; }
            existing = data;
        }
        companyMap[c.name] = existing.id;
        console.log(`Company: ${c.name} (${existing.id})`);
    }

    // 2. Brands
    const brands = [
        { name: 'Jeep', company: 'Stellantis', color: '#FFB900' },
        { name: 'Cheetos', company: 'Pepsico', color: '#FF6600' }
    ];
    const brandMap = {}; // name -> id

    for (const b of brands) {
        const companyId = companyMap[b.company];
        if (!companyId) continue;

        let { data: existing } = await supabase.from('brands').select('id').eq('name', b.name).eq('company_id', companyId).maybeSingle();
        if (!existing) {
            const { data, error } = await supabase.from('brands').insert({
                name: b.name,
                company_id: companyId,
                color: b.color
            }).select().single();
            if (error) { console.error('Error creating brand', b.name, error); continue; }
            existing = data;
        }
        brandMap[b.name] = existing.id;
        console.log(`Brand: ${b.name} (${existing.id})`);
    }

    // 3. Teams
    const teams = [
        { name: 'CAC JEEP', brand: 'Jeep' },
        { name: 'Cheetos Support', brand: 'Cheetos' }
    ];
    const teamMap = {}; // name -> id

    for (const t of teams) {
        const brandId = brandMap[t.brand];
        if (!brandId) continue;

        let { data: existing } = await supabase.from('teams').select('id').eq('name', t.name).eq('brand_id', brandId).maybeSingle();
        if (!existing) {
            const { data, error } = await supabase.from('teams').insert({
                name: t.name,
                brand_id: brandId
            }).select().single();
            if (error) { console.error('Error creating team', t.name, error); continue; }
            existing = data;
        }
        teamMap[t.name] = existing.id;
        console.log(`Team: ${t.name} (${existing.id})`);
    }

    // 4. Managed Interfaces
    const interfaces = [
        { name: 'Genesys Cloud', status: 'connected', icon: 'headphones' },
        { name: 'Salesforce', status: 'connected', icon: 'globe' },
        { name: 'ServiceNow', status: 'connected', icon: 'globe' }
    ];
    const interfaceMap = {}; // name -> id

    for (const iface of interfaces) {
        let { data: existing } = await supabase.from('managed_interfaces').select('id').eq('name', iface.name).maybeSingle();
        if (!existing) {
            // Need base_url which is required
            const { data, error } = await supabase.from('managed_interfaces').insert({
                ...iface,
                base_url: 'https://example.com'
            }).select().single();
            if (error) { console.error('Error interface', iface.name, error); continue; }
            existing = data;
        }
        interfaceMap[iface.name] = existing.id;
    }

    // 5. Link Teams to Interfaces
    // Jeep -> Salesforce, ServiceNow
    // Cheetos -> Genesys
    const links = [
        { team: 'CAC JEEP', iface: 'Salesforce' },
        { team: 'CAC JEEP', iface: 'ServiceNow' },
        { team: 'Cheetos Support', iface: 'Genesys Cloud' }
    ];

    for (const l of links) {
        const teamId = teamMap[l.team];
        const ifaceId = interfaceMap[l.iface];
        if (teamId && ifaceId) {
            const { error } = await supabase.from('team_interfaces').upsert(
                { team_id: teamId, interface_id: ifaceId },
                { onConflict: 'team_id,interface_id' }
            );
            if (!error) console.log(`Linked ${l.team} to ${l.iface}`);
            else console.error('Link error', error.message);
        }
    }

    // 6. Users (Optional: Upsert users so they appear in Super Admin list if not there)
    // We will just log valid emails to use
    console.log('--- READY TO TEST ---');
    console.log('Login as Super Admin, go to Users tab.');
    console.log('Look for users in teams: "CAC JEEP" or "Cheetos Support".');
    console.log('If they don\'t exist, create them in the UI and assign them to these teams.');
}

seed().catch(console.error);
