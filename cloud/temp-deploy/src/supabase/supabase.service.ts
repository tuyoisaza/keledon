import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private client: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.warn('⚠️ Supabase credentials not configured. Database features disabled.');
            return;
        }

        this.client = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
            },
        });
        console.log('✅ Supabase client initialized');
    }

    getClient(): SupabaseClient {
        if (!this.client) {
            throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
        }
        return this.client;
    }

    // ========== MANAGED INTERFACES ==========

    async getAllInterfaces() {
        const { data, error } = await this.getClient()
            .from('managed_interfaces')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getInterface(id: string) {
        const { data, error } = await this.getClient()
            .from('managed_interfaces')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async createInterface(interfaceData: {
        name: string;
        base_url: string;
        icon?: string;
        category?: string;
        provider_key?: string;
        capabilities?: object;
        status?: string;
        credentials?: object;
    }) {
        const { data, error } = await this.getClient()
            .from('managed_interfaces')
            .insert({
                name: interfaceData.name,
                base_url: interfaceData.base_url,
                icon: interfaceData.icon,
                category: interfaceData.category,
                provider_key: interfaceData.provider_key,
                capabilities: interfaceData.capabilities,
                status: interfaceData.status || 'disconnected',
                credentials: interfaceData.credentials,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateInterface(id: string, updates: Partial<{
        name: string;
        base_url: string;
        icon: string;
        category: string;
        provider_key: string;
        capabilities: object;
        status: string;
        credentials: object;
    }>) {
        const { data, error } = await this.getClient()
            .from('managed_interfaces')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteInterface(id: string) {
        const { error } = await this.getClient()
            .from('managed_interfaces')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // ========== WORKFLOWS ==========

    async getAllWorkflows() {
        const { data, error } = await this.getClient()
            .from('workflows')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getWorkflow(id: string) {
        const { data, error } = await this.getClient()
            .from('workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async getWorkflowsByInterface(interfaceId: string) {
        const { data, error } = await this.getClient()
            .from('workflows')
            .select('*')
            .eq('interface_id', interfaceId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getWorkflowByTrigger(triggerType: string, triggerValue: string) {
        const { data, error } = await this.getClient()
            .from('workflows')
            .select('*')
            .eq('is_enabled', true)
            .contains('trigger', { type: triggerType, value: triggerValue });

        if (error) throw error;
        return data?.[0];
    }

    async createWorkflow(workflowData: {
        name: string;
        description?: string;
        interface_id?: string;
        trigger: object;
        steps?: object[];
        variables?: object;
        is_enabled?: boolean;
    }) {
        const { data, error } = await this.getClient()
            .from('workflows')
            .insert({
                name: workflowData.name,
                description: workflowData.description,
                interface_id: workflowData.interface_id,
                trigger: workflowData.trigger,
                steps: workflowData.steps || [],
                variables: workflowData.variables || {},
                is_enabled: workflowData.is_enabled ?? true,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateWorkflow(id: string, updates: Partial<{
        name: string;
        description: string;
        interface_id: string;
        trigger: object;
        steps: object[];
        variables: object;
        is_enabled: boolean;
    }>) {
        const { data, error } = await this.getClient()
            .from('workflows')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteWorkflow(id: string) {
        const { error } = await this.getClient()
            .from('workflows')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // ========== FLOW DEFINITIONS ==========

    async getAllFlowDefinitions() {
        const { data, error } = await this.getClient()
            .from('flow_definitions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getFlowDefinition(id: string) {
        const { data, error } = await this.getClient()
            .from('flow_definitions')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async createFlowDefinition(definitionData: {
        company_id?: string;
        interface_id?: string;
        name: string;
        category?: string;
        intent_tags?: string[];
        description?: string;
    }) {
        const { data, error } = await this.getClient()
            .from('flow_definitions')
            .insert({
                company_id: definitionData.company_id,
                interface_id: definitionData.interface_id,
                name: definitionData.name,
                category: definitionData.category,
                intent_tags: definitionData.intent_tags || [],
                description: definitionData.description,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateFlowDefinition(id: string, updates: Partial<{
        company_id: string;
        interface_id: string;
        name: string;
        category: string;
        intent_tags: string[];
        description: string;
    }>) {
        const { data, error } = await this.getClient()
            .from('flow_definitions')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteFlowDefinition(id: string) {
        const { error } = await this.getClient()
            .from('flow_definitions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // ========== FLOW VERSIONS ==========

    async getAllFlowVersions() {
        const { data, error } = await this.getClient()
            .from('flow_versions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getFlowVersion(id: string) {
        const { data, error } = await this.getClient()
            .from('flow_versions')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async getFlowVersionsByDefinition(flowDefinitionId: string) {
        const { data, error } = await this.getClient()
            .from('flow_versions')
            .select('*')
            .eq('flow_definition_id', flowDefinitionId)
            .order('version', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async createFlowVersion(versionData: {
        flow_definition_id: string;
        version: number;
        steps?: object[];
        status?: string;
        created_by?: string;
    }) {
        const { data, error } = await this.getClient()
            .from('flow_versions')
            .insert({
                flow_definition_id: versionData.flow_definition_id,
                version: versionData.version,
                steps: versionData.steps || [],
                status: versionData.status || 'draft',
                created_by: versionData.created_by,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateFlowVersion(id: string, updates: Partial<{
        version: number;
        steps: object[];
        status: string;
        created_by: string;
    }>) {
        const { data, error } = await this.getClient()
            .from('flow_versions')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteFlowVersion(id: string) {
        const { error } = await this.getClient()
            .from('flow_versions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // ========== TENANT FLOW PERMISSIONS ==========

    async getTenantFlowPermissions(companyId: string) {
        const { data, error } = await this.getClient()
            .from('tenant_flow_permissions')
            .select('*')
            .eq('company_id', companyId);

        if (error) throw error;
        return data || [];
    }

    async getAllTenantFlowPermissions() {
        const { data, error } = await this.getClient()
            .from('tenant_flow_permissions')
            .select('*');

        if (error) throw error;
        return data || [];
    }

    async upsertTenantFlowPermissions(entries: { company_id: string; flow_definition_id: string; is_enabled?: boolean; default_for_intent?: string }[]) {
        const { data, error } = await this.getClient()
            .from('tenant_flow_permissions')
            .upsert(entries, { onConflict: 'company_id,flow_definition_id' })
            .select();

        if (error) throw error;
        return data || [];
    }

    // ========== INTENT FLOW MAPPINGS ==========

    async getIntentFlowMappings(companyId: string) {
        const { data, error } = await this.getClient()
            .from('intent_flow_mappings')
            .select('*')
            .eq('company_id', companyId);

        if (error) throw error;
        return data || [];
    }

    async getAllIntentFlowMappings() {
        const { data, error } = await this.getClient()
            .from('intent_flow_mappings')
            .select('*');

        if (error) throw error;
        return data || [];
    }

    // ========== PROVIDER CATALOG ==========

    async getProviderCatalog() {
        const { data, error } = await this.getClient()
            .from('provider_catalog')
            .select('*')
            .order('type')
            .order('name');

        if (error) throw error;
        return data || [];
    }

    async upsertIntentFlowMapping(entry: { company_id: string; intent: string; allowed_flow_definition_ids: string[] }) {
        const { data, error } = await this.getClient()
            .from('intent_flow_mappings')
            .upsert(entry, { onConflict: 'company_id,intent' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ========== FLOW RUNS ==========

    async createFlowRun(runData: { flow_version_id: string; session_id?: string; company_id?: string; status?: string }) {
        const { data, error } = await this.getClient()
            .from('flow_runs')
            .insert({
                flow_version_id: runData.flow_version_id,
                session_id: runData.session_id,
                company_id: runData.company_id,
                status: runData.status || 'running'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateFlowRun(id: string, updates: Partial<{ status: string; completed_at: string }>) {
        const { data, error } = await this.getClient()
            .from('flow_runs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async createFlowRunEvidence(evidence: { flow_run_id: string; step_index?: number; action?: string; selector?: string; value?: string; screenshot_hash?: string; result?: string }) {
        const { data, error } = await this.getClient()
            .from('flow_run_evidence')
            .insert(evidence)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ========== COMPANIES ==========

    async getAllCompanies() {
        const { data, error } = await this.getClient()
            .from('companies')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    }

    async createCompany(companyData: { name: string; industry?: string; agent_count?: number }) {
        const { data, error } = await this.getClient()
            .from('companies')
            .insert(companyData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateCompany(id: string, updates: Partial<{ name: string; industry: string; agent_count: number }>) {
        const { data, error } = await this.getClient()
            .from('companies')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteCompany(id: string) {
        const { error } = await this.getClient()
            .from('companies')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // ========== BRANDS ==========

    async getAllBrands() {
        const { data, error } = await this.getClient()
            .from('brands')
            .select('*, companies(name)')
            .order('name');

        if (error) throw error;
        return data || [];
    }

    async createBrand(brandData: { name: string; company_id: string; color?: string }) {
        const { data, error } = await this.getClient()
            .from('brands')
            .insert(brandData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateBrand(id: string, updates: Partial<{ name: string; company_id: string; color: string }>) {
        const { data, error } = await this.getClient()
            .from('brands')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteBrand(id: string) {
        const { error } = await this.getClient()
            .from('brands')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // ========== TEAMS ==========

    async getAllTeams() {
        const { data, error } = await this.getClient()
            .from('teams')
            .select('*, brands(name)')
            .order('name');

        if (error) throw error;
        return data || [];
    }

    async createTeam(teamData: { name: string; brand_id: string; member_count?: number }) {
        const { data, error } = await this.getClient()
            .from('teams')
            .insert(teamData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateTeam(id: string, updates: Partial<{ name: string; brand_id: string; member_count: number }>) {
        const { data, error } = await this.getClient()
            .from('teams')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteTeam(id: string) {
        const { error } = await this.getClient()
            .from('teams')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // ========== AGENTS ==========

    async getAllAgents() {
        const { data, error } = await this.getClient()
            .from('agents')
            .select('*, teams(name)')
            .order('name');

        if (error) throw error;
        return data || [];
    }

    async createAgent(agentData: { name: string; team_id: string; email?: string; role?: string; autonomy_level?: number; policies?: object }) {
        const { data, error } = await this.getClient()
            .from('agents')
            .insert({
                name: agentData.name,
                team_id: agentData.team_id,
                email: agentData.email,
                role: agentData.role,
                autonomy_level: agentData.autonomy_level || 1,
                policies: agentData.policies || {}
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateAgent(id: string, updates: Partial<{ name: string; team_id: string; email: string; role: string; autonomy_level: number; policies: object }>) {
        const { data, error } = await this.getClient()
            .from('agents')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteAgent(id: string) {
        const { error } = await this.getClient()
            .from('agents')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
