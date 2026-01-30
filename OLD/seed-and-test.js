const BASE_URL = 'http://localhost:3001/api/admin';

async function request(method, endpoint, data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Request failed: ${response.status} ${text}`);
    }
    return response.json();
}

async function run() {
    console.log('🚀 Starting Sample Data Creation & CRUD Test...');

    try {
        // 1. Create Sample Data (Hierarchy)
        console.log('\n📦 Creating Sample Hierarchy...');

        // Company
        const company = await request('POST', '/companies', {
            name: 'Acme Corp',
            industry: 'Technology',
            agent_count: 150
        });
        console.log('✅ Created Company:', company.name, `(${company.id})`);

        // Brand
        const brand = await request('POST', '/brands', {
            name: 'Acme Robotics',
            company_id: company.id,
            color: '#FF5733'
        });
        console.log('✅ Created Brand:', brand.name, `(${brand.id})`);

        // Team
        const team = await request('POST', '/teams', {
            name: 'Core Systems',
            brand_id: brand.id,
            member_count: 12
        });
        console.log('✅ Created Team:', team.name, `(${team.id})`);

        // Agent
        const agent = await request('POST', '/agents', {
            name: 'Keldon Bot',
            team_id: team.id,
            email: 'bot@acme.com',
            role: 'Automator'
        });
        console.log('✅ Created Agent:', agent.name, `(${agent.id})`);

        // 2. Verify Reading Data
        console.log('\n🔍 Verifying Data Read...');
        const companies = await request('GET', '/companies');
        console.log(`✅ Found ${companies.length} companies`);

        const agents = await request('GET', '/agents');
        const foundAgent = agents.find(a => a.id === agent.id);
        if (foundAgent) console.log('✅ Verified Agent exists in list');

        // 3. Test CRUD (Update & Delete)
        console.log('\n🛠 Testing CRUD Operations...');

        // Update Agent
        const updatedAgent = await request('PUT', `/agents/${agent.id}`, {
            name: 'Super Keldon Bot', // Changed name
            team_id: team.id,
            email: 'bot@acme.com',
            role: 'Super Automator'
        });
        console.log('✅ Updated Agent Name:', updatedAgent.name);

        // Verify Update
        const verifyAgent = (await request('GET', '/agents')).find(a => a.id === agent.id);
        if (verifyAgent.name === 'Super Keldon Bot') {
            console.log('✅ Verified Update persisted');
        } else {
            console.error('❌ Update failed verification');
        }

        // Create a temporary item to delete
        console.log('\n🗑 Testing Delete...');
        const tempCompany = await request('POST', '/companies', { name: 'To Be Deleted' });
        console.log('Created temp company:', tempCompany.id);

        await request('DELETE', `/companies/${tempCompany.id}`);

        const verifyDelete = (await request('GET', '/companies')).find(c => c.id === tempCompany.id);
        if (!verifyDelete) {
            console.log('✅ Verified Delete successful');
        } else {
            console.error('❌ Delete failed verification');
        }

        console.log('\n🎉 All operations completed successfully!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

run();
