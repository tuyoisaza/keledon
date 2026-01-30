const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getOrCreateCompany() {
    const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')
        .limit(1);

    if (error) throw error;

    if (companies && companies.length > 0) {
        return companies[0];
    }

    const { data: created, error: createError } = await supabase
        .from('companies')
        .insert({ name: 'Demo Company', industry: 'Demo' })
        .select()
        .single();

    if (createError) throw createError;
    return created;
}

async function getOrCreateInterface(definition) {
    const { data: existing, error } = await supabase
        .from('managed_interfaces')
        .select('*')
        .eq('name', definition.name)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (existing) return existing;

    const { data: created, error: createError } = await supabase
        .from('managed_interfaces')
        .insert(definition)
        .select()
        .single();

    if (createError) throw createError;
    return created;
}

async function getOrCreateFlowDefinition(definition) {
    const { data: existing, error } = await supabase
        .from('flow_definitions')
        .select('*')
        .eq('name', definition.name)
        .eq('company_id', definition.company_id)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (existing) return existing;

    const { data: created, error: createError } = await supabase
        .from('flow_definitions')
        .insert(definition)
        .select()
        .single();

    if (createError) throw createError;
    return created;
}

async function ensureFlowVersion(flowDefinitionId, version, steps) {
    const { data: existing, error } = await supabase
        .from('flow_versions')
        .select('*')
        .eq('flow_definition_id', flowDefinitionId)
        .eq('version', version)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (existing) return existing;

    const { data: created, error: createError } = await supabase
        .from('flow_versions')
        .insert({
            flow_definition_id: flowDefinitionId,
            version,
            status: 'approved',
            steps,
        })
        .select()
        .single();

    if (createError) throw createError;
    return created;
}

async function seed() {
    console.log('🌱 Seeding Flow Catalog...');

    const company = await getOrCreateCompany();

    const interfaceDefinitions = [
        {
            name: 'Genesys Cloud',
            base_url: 'https://api.genesys.cloud',
            icon: '🟢',
            category: 'talk',
            provider_key: 'genesys',
            capabilities: { stt: true, tts: true, rpa: false },
            status: 'connected',
        },
        {
            name: 'Avaya OneCloud',
            base_url: 'https://api.avaya.com',
            icon: '🔴',
            category: 'talk',
            provider_key: 'avaya',
            capabilities: { stt: true, tts: true, rpa: false },
            status: 'disconnected',
        },
        {
            name: 'Google Meet',
            base_url: 'https://meet.google.com',
            icon: '🔵',
            category: 'talk',
            provider_key: 'meet',
            capabilities: { stt: true, tts: true, rpa: false },
            status: 'connected',
        },
        {
            name: 'Salesforce Production',
            base_url: 'https://login.salesforce.com',
            icon: '🟦',
            category: 'case',
            provider_key: 'salesforce',
            capabilities: { stt: false, tts: false, rpa: true },
            status: 'connected',
        },
        {
            name: 'Kustomer',
            base_url: 'https://app.kustomer.com',
            icon: '🟣',
            category: 'case',
            provider_key: 'kustomer',
            capabilities: { stt: false, tts: false, rpa: true },
            status: 'disconnected',
        },
        {
            name: 'HubSpot',
            base_url: 'https://app.hubspot.com',
            icon: '🟠',
            category: 'case',
            provider_key: 'hubspot',
            capabilities: { stt: false, tts: false, rpa: true },
            status: 'disconnected',
        }
    ];

    const interfaceMap = new Map();
    for (const iface of interfaceDefinitions) {
        const created = await getOrCreateInterface(iface);
        interfaceMap.set(created.name, created.id);
    }

    const flowDefinitions = [
        {
            name: 'Salesforce Create Case',
            description: 'Create a new customer support case in Salesforce.',
            interface_id: interfaceMap.get('Salesforce Production'),
            company_id: company.id,
            category: 'case',
            intent_tags: ['Create Case', 'Open Case'],
        },
        {
            name: 'HubSpot Update Ticket',
            description: 'Update an existing ticket record in HubSpot.',
            interface_id: interfaceMap.get('HubSpot'),
            company_id: company.id,
            category: 'case',
            intent_tags: ['Update Ticket', 'Update Case'],
        },
        {
            name: 'Kustomer Log Interaction',
            description: 'Log interaction summary in Kustomer.',
            interface_id: interfaceMap.get('Kustomer'),
            company_id: company.id,
            category: 'case',
            intent_tags: ['Log Interaction', 'After Call Work'],
        }
    ];

    const flowDefinitionMap = new Map();
    for (const def of flowDefinitions) {
        const created = await getOrCreateFlowDefinition(def);
        flowDefinitionMap.set(created.name, created.id);
    }

    const stepsByFlow = new Map([
        ['Salesforce Create Case', [
            { id: 'step-1', action: 'navigate', url: 'https://login.salesforce.com' },
            { id: 'step-2', action: 'wait_for', selector: '#username', timeout: 8000 },
            { id: 'step-3', action: 'fill', selector: '#case-subject', value: '{{case_subject}}' },
            { id: 'step-4', action: 'fill', selector: '#case-description', value: '{{case_description}}' },
            { id: 'step-5', action: 'click', selector: 'button[type="submit"]' },
        ]],
        ['HubSpot Update Ticket', [
            { id: 'step-1', action: 'navigate', url: 'https://app.hubspot.com' },
            { id: 'step-2', action: 'wait_for', selector: '[data-test="ticket-title"]', timeout: 8000 },
            { id: 'step-3', action: 'fill', selector: '[data-test="ticket-status"]', value: '{{ticket_status}}' },
            { id: 'step-4', action: 'click', selector: '[data-test="save-ticket"]' },
        ]],
        ['Kustomer Log Interaction', [
            { id: 'step-1', action: 'navigate', url: 'https://app.kustomer.com' },
            { id: 'step-2', action: 'wait_for', selector: '[data-test="conversation-log"]', timeout: 8000 },
            { id: 'step-3', action: 'fill', selector: '[data-test="conversation-summary"]', value: '{{summary}}' },
            { id: 'step-4', action: 'click', selector: '[data-test="save-interaction"]' },
        ]],
    ]);

    for (const [name, flowId] of flowDefinitionMap.entries()) {
        const steps = stepsByFlow.get(name) || [];
        await ensureFlowVersion(flowId, 1, steps);
    }

    const permissions = Array.from(flowDefinitionMap.values()).map((flowId) => ({
        company_id: company.id,
        flow_definition_id: flowId,
        is_enabled: true,
    }));

    await supabase
        .from('tenant_flow_permissions')
        .upsert(permissions, { onConflict: 'company_id,flow_definition_id' });

    const intentMappings = [
        { intent: 'Create Case', flowName: 'Salesforce Create Case' },
        { intent: 'Update Ticket', flowName: 'HubSpot Update Ticket' },
        { intent: 'Log Interaction', flowName: 'Kustomer Log Interaction' },
    ];

    for (const mapping of intentMappings) {
        const flowId = flowDefinitionMap.get(mapping.flowName);
        if (!flowId) continue;
        await supabase
            .from('intent_flow_mappings')
            .upsert({
                company_id: company.id,
                intent: mapping.intent,
                allowed_flow_definition_ids: [flowId],
            }, { onConflict: 'company_id,intent' });
    }

    console.log('✅ Flow catalog seeded for company:', company.name);
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
});
