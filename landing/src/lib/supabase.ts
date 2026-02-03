import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client for frontend use
// Uses the anon/public key which has Row Level Security applied

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            storage: window.sessionStorage,
        },
    })
    : null;

// ========== TYPE DEFINITIONS ==========

export interface Company {
    id: string;
    name: string;
    industry?: string;
    // agent_count deprecated in favor of specific team assignments
    created_at?: string;
    updated_at?: string;
    countries?: { country_code: string }[];
}

export interface CompanyCountry {
    company_id: string;
    country_code: string;
    created_at?: string;
}

export interface Brand {
    id: string;
    company_id: string;
    name: string;
    color?: string;
    created_at?: string;
    updated_at?: string;
    companies?: { name: string };
}

export interface Team {
    id: string;
    brand_id: string;
    name: string;
    country?: string; // ISO country code
    member_count?: number;
    created_at?: string;
    updated_at?: string;
    brands?: { name: string };
}

export interface Agent {
    id: string;
    team_id: string;
    user_id?: string;
    name: string;
    email?: string;
    role?: string;
    is_active?: boolean;
    calls_handled?: number;
    fcr_rate?: number;
    avg_handle_time?: number;
    autonomy_level?: number;
    policies?: any;
    created_at?: string;
    updated_at?: string;
    teams?: { name: string };
    users?: { name: string; email: string };
}

export interface User {
    id: string;
    company_id?: string;
    team_id?: string;
    email: string;
    name: string;
    role: 'user' | 'admin' | 'superadmin';
    is_online?: boolean;
    last_login?: string;
    created_at?: string;
    updated_at?: string;
    companies?: { name: string };
    teams?: { name: string };
}

export interface ManagedInterface {
    id: string;
    name: string;
    base_url: string;
    category?: 'talk' | 'case';
    provider_key?: string;
    capabilities?: Record<string, any>;
    icon?: string;
    status: 'connected' | 'disconnected' | 'error';
    credentials?: object;
    created_at?: string;
    updated_at?: string;
}

export interface Workflow {
    id: string;
    interface_id?: string;
    name: string;
    description?: string;
    trigger: {
        type: string;
        value: string;
        confidence?: number;
    };
    steps: object[];
    variables: Record<string, string>;
    is_enabled: boolean;
    created_at?: string;
    updated_at?: string;
}

export type ProviderType = 'stt' | 'tts' | 'rpa';
export type ProviderStatus = 'experimental' | 'production' | 'deprecated';

export interface ProviderCatalogEntry {
    id: string;
    type: ProviderType;
    name: string;
    description?: string;
    status?: ProviderStatus;
    is_enabled: boolean;
    metadata?: any;
    created_at?: string;
    updated_at?: string;
}

export interface TenantProviderConfig {
    id: string;
    company_id: string;
    provider_id: string;
    provider_type: ProviderType;
    is_enabled: boolean;
    is_default: boolean;
    limits?: any;
    provider_catalog?: ProviderCatalogEntry;
    created_at?: string;
    updated_at?: string;
}

export interface TenantVoiceProfile {
    id: string;
    company_id: string;
    provider_id: string;
    name: string;
    language?: string;
    is_enabled: boolean;
    is_default: boolean;
    config?: any;
    provider_catalog?: ProviderCatalogEntry;
    created_at?: string;
    updated_at?: string;
}

// ========== HELPER FUNCTIONS ==========

function ensureClient(): SupabaseClient {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }
    return supabase;
}

// ========== COMPANIES ==========

export async function getCompanies(): Promise<Company[]> {
    const { data, error } = await ensureClient()
        .from('companies')
        .select('*, countries:company_countries(country_code)')
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function addCompanyCountry(companyId: string, countryCode: string): Promise<void> {
    const { error } = await ensureClient()
        .from('company_countries')
        .insert([{ company_id: companyId, country_code: countryCode }]);

    if (error) throw error;
}

export async function removeCompanyCountry(companyId: string, countryCode: string): Promise<void> {
    const { error } = await ensureClient()
        .from('company_countries')
        .delete()
        .match({ company_id: companyId, country_code: countryCode });

    if (error) throw error;
}

export async function createCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    const { data, error } = await ensureClient()
        .from('companies')
        .insert(company)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const { data, error } = await ensureClient()
        .from('companies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCompany(id: string): Promise<void> {
    const { error } = await ensureClient()
        .from('companies')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== BRANDS ==========

export async function getBrands(companyId?: string): Promise<Brand[]> {
    let query = ensureClient()
        .from('brands')
        .select('*, companies(name)');

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;
    return data || [];
}

export async function createBrand(brand: Omit<Brand, 'id' | 'created_at' | 'updated_at' | 'companies'>): Promise<Brand> {
    const { data, error } = await ensureClient()
        .from('brands')
        .insert(brand)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateBrand(id: string, updates: Partial<Brand>): Promise<Brand> {
    const { data, error } = await ensureClient()
        .from('brands')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteBrand(id: string): Promise<void> {
    const { error } = await ensureClient()
        .from('brands')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== TEAMS ==========

export async function getTeams(companyId?: string): Promise<Team[]> {
    let query = ensureClient()
        .from('teams')
        .select('*, brands(name, company_id)');

    const { data, error } = await query.order('name');
    if (error) throw error;

    let results = data || [];
    if (companyId) {
        // Filter by company_id related through brand
        results = results.filter((t: any) => t.brands?.company_id === companyId);
    }

    return results;
}

export async function createTeam(team: Omit<Team, 'id' | 'created_at' | 'updated_at' | 'brands'>): Promise<Team> {
    const { data, error } = await ensureClient()
        .from('teams')
        .insert(team)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const { data, error } = await ensureClient()
        .from('teams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteTeam(id: string): Promise<void> {
    const { error } = await ensureClient()
        .from('teams')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== AGENTS ==========

export async function getAgents(companyId?: string): Promise<Agent[]> {
    let query = ensureClient()
        .from('agents')
        .select('*, teams(name, brands(company_id)), users(name, email)');

    const { data, error } = await query.order('name');
    if (error) throw error;

    let results = data || [];
    if (companyId) {
        // Filter by company_id related through team -> brand
        results = results.filter((a: any) => a.teams?.brands?.company_id === companyId);
    }

    return results;
}

export async function createAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'teams'>): Promise<Agent> {
    const { data, error } = await ensureClient()
        .from('agents')
        .insert(agent)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
    const { data, error } = await ensureClient()
        .from('agents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteAgent(id: string): Promise<void> {
    const { error } = await ensureClient()
        .from('agents')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== USERS ==========

export async function getUsers(companyId?: string): Promise<User[]> {
    let query = ensureClient()
        .from('users')
        .select('*, companies(name), teams(name)');

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;
    return data || [];
}

export async function createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'companies' | 'teams'>): Promise<User> {
    const { data, error } = await ensureClient()
        .from('users')
        .insert(user)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await ensureClient()
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteUser(id: string): Promise<void> {
    const { error } = await ensureClient()
        .from('users')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== MANAGED INTERFACES ==========

export async function getManagedInterfaces(): Promise<ManagedInterface[]> {
    const { data, error } = await ensureClient()
        .from('managed_interfaces')
        .select('*')
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function createManagedInterface(iface: Omit<ManagedInterface, 'id' | 'created_at' | 'updated_at'>): Promise<ManagedInterface> {
    const { data, error } = await ensureClient()
        .from('managed_interfaces')
        .insert(iface)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateManagedInterface(id: string, updates: Partial<ManagedInterface>): Promise<ManagedInterface> {
    const { data, error } = await ensureClient()
        .from('managed_interfaces')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteManagedInterface(id: string): Promise<void> {
    const { error } = await ensureClient()
        .from('managed_interfaces')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== WORKFLOWS ==========

export async function getWorkflows(): Promise<Workflow[]> {
    const { data, error } = await ensureClient()
        .from('workflows')
        .select('*')
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function createWorkflow(workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>): Promise<Workflow> {
    const { data, error } = await ensureClient()
        .from('workflows')
        .insert(workflow)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const { data, error } = await ensureClient()
        .from('workflows')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteWorkflow(id: string): Promise<void> {
    const { error } = await ensureClient()
        .from('workflows')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== PROVIDER CATALOG ==========

export async function getProviderCatalog(): Promise<ProviderCatalogEntry[]> {
    const { data, error } = await ensureClient()
        .from('provider_catalog')
        .select('*')
        .order('type')
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function upsertProviderCatalog(entries: ProviderCatalogEntry[]): Promise<ProviderCatalogEntry[]> {
    const { data, error } = await ensureClient()
        .from('provider_catalog')
        .upsert(entries, { onConflict: 'id' })
        .select();

    if (error) throw error;
    return data || [];
}

// ========== TENANT PROVIDER CONFIG ==========

export async function getTenantProviderConfig(companyId: string): Promise<TenantProviderConfig[]> {
    const { data, error } = await ensureClient()
        .from('tenant_provider_config')
        .select('*, provider_catalog(*)')
        .eq('company_id', companyId);

    if (error) throw error;
    return data || [];
}

export async function upsertTenantProviderConfig(entries: Omit<TenantProviderConfig, 'provider_catalog'>[]): Promise<TenantProviderConfig[]> {
    const { data, error } = await ensureClient()
        .from('tenant_provider_config')
        .upsert(entries, { onConflict: 'company_id,provider_id' })
        .select('*, provider_catalog(*)');

    if (error) throw error;
    return data || [];
}

// ========== TENANT VOICE PROFILES ==========

export async function getTenantVoiceProfiles(companyId: string): Promise<TenantVoiceProfile[]> {
    const { data, error } = await ensureClient()
        .from('tenant_voice_profiles')
        .select('*, provider_catalog(*)')
        .eq('company_id', companyId)
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function createTenantVoiceProfile(profile: Omit<TenantVoiceProfile, 'id' | 'provider_catalog' | 'created_at' | 'updated_at'>): Promise<TenantVoiceProfile> {
    const { data, error } = await ensureClient()
        .from('tenant_voice_profiles')
        .insert(profile)
        .select('*, provider_catalog(*)')
        .single();

    if (error) throw error;
    return data;
}

export async function updateTenantVoiceProfile(id: string, updates: Partial<TenantVoiceProfile>): Promise<TenantVoiceProfile> {
    const { data, error } = await ensureClient()
        .from('tenant_voice_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, provider_catalog(*)')
        .single();

    if (error) throw error;
    return data;
}

export async function deleteTenantVoiceProfile(id: string): Promise<void> {
    const { error } = await ensureClient()
        .from('tenant_voice_profiles')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== TEAM INTERFACES ==========

export interface TeamInterface {
    team_id: string;
    interface_id: string;
    managed_interfaces?: ManagedInterface;
}

export async function getTeamInterfaces(teamId: string): Promise<ManagedInterface[]> {
    const { data, error } = await ensureClient()
        .from('team_interfaces')
        .select(`
            interface_id,
            managed_interfaces (*)
        `)
        .eq('team_id', teamId);

    if (error) throw error;

    // Map to flatten the structure and return only the interface details
    return data.map((item: any) => item.managed_interfaces as ManagedInterface).filter(Boolean);
}

export async function getTeamDetails(teamId: string) {
    const { data, error } = await ensureClient()
        .from('teams')
        .select(`
            *,
            brands (
                name,
                companies (
                    name
                )
            )
        `)
        .eq('id', teamId)
        .single();

    if (error) throw error;
    return data;
}
