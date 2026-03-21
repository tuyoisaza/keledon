// API Client for KELEDON Backend
// Replaces Supabase client with backend API calls

const API_BASE = '/api/crud';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// ========== TYPE DEFINITIONS ==========

export interface Company {
    id: string;
    name: string;
    industry?: string;
    createdAt?: string;
    updatedAt?: string;
    countries?: CompanyCountry[];
    companies?: { name: string };
}

export interface CompanyCountry {
    id?: string;
    companyId: string;
    countryCode: string;
    createdAt?: string;
}

export interface Brand {
    id: string;
    companyId: string;
    name: string;
    color?: string;
    createdAt?: string;
    updatedAt?: string;
    companies?: { id: string; name: string };
    brand?: { name: string; companyId: string };
}

export interface Team {
    id: string;
    brandId?: string;
    name: string;
    country?: string;
    member_count?: number;
    createdAt?: string;
    updatedAt?: string;
    brands?: { name: string; companyId: string };
    company?: { id: string; name: string };
}

export interface Agent {
    id: string;
    teamId: string;
    userId?: string;
    name: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    callsHandled?: number;
    fcrRate?: number;
    avgHandleTime?: number;
    autonomyLevel?: number;
    policies?: string;
    createdAt?: string;
    updatedAt?: string;
    teams?: { name: string; brand?: { name: string; companyId: string } };
    users?: { name: string; email: string };
}

export interface User {
    id: string;
    companyId?: string;
    teamId?: string;
    email: string;
    name?: string;
    role: string;
    isOnline?: boolean;
    lastLogin?: string;
    createdAt?: string;
    updatedAt?: string;
    companies?: { id: string; name: string };
    teams?: { id: string; name: string };
}

export interface ManagedInterface {
    id: string;
    name: string;
    baseUrl: string;
    category?: 'talk' | 'case';
    providerKey?: string;
    capabilities?: string;
    icon?: string;
    status: 'connected' | 'disconnected' | 'error';
    credentials?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Workflow {
    id: string;
    interfaceId?: string;
    name: string;
    description?: string;
    trigger: string;
    steps: string;
    variables: string;
    isEnabled: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type ProviderType = 'stt' | 'tts' | 'rpa';
export type ProviderStatus = 'experimental' | 'production' | 'deprecated';

export interface ProviderCatalogEntry {
    id: string;
    type: ProviderType;
    name: string;
    description?: string;
    status?: ProviderStatus;
    isEnabled: boolean;
    metadata?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface TenantProviderConfig {
    id: string;
    companyId: string;
    providerId: string;
    providerType: ProviderType;
    isEnabled: boolean;
    isDefault: boolean;
    limits?: string;
    providerCatalog?: ProviderCatalogEntry;
    createdAt?: string;
    updatedAt?: string;
}

export interface TenantVoiceProfile {
    id: string;
    companyId: string;
    providerId: string;
    name: string;
    language?: string;
    isEnabled: boolean;
    isDefault: boolean;
    config?: string;
    providerCatalog?: ProviderCatalogEntry;
    createdAt?: string;
    updatedAt?: string;
}

export interface Session {
    id: string;
    userId?: string;
    teamId?: string;
    status?: string;
    metadata?: string;
    createdAt?: string;
    updatedAt?: string;
    user?: { id: string; name: string };
    team?: { id: string; name: string };
    events?: Event[];
}

export interface Event {
    id: string;
    sessionId: string;
    type: string;
    payload?: string;
    createdAt?: string;
}

export interface TeamInterface {
    teamId: string;
    interfaceId: string;
    managedInterface?: ManagedInterface;
}

// ========== COMPANIES ==========

export async function getCompanies(): Promise<Company[]> {
    return apiFetch<Company[]>('/companies');
}

export async function addCompanyCountry(companyId: string, countryCode: string): Promise<CompanyCountry> {
    return apiFetch<CompanyCountry>(`/companies/${companyId}/countries`, {
        method: 'POST',
        body: JSON.stringify({ countryCode }),
    });
}

export async function removeCompanyCountry(companyId: string, countryCode: string): Promise<void> {
    return apiFetch<void>(`/companies/${companyId}/countries/${countryCode}`, {
        method: 'DELETE',
    });
}

export async function createCompany(company: { name: string; industry?: string; countries?: string[] }): Promise<Company> {
    return apiFetch<Company>('/companies', {
        method: 'POST',
        body: JSON.stringify(company),
    });
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    return apiFetch<Company>(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function deleteCompany(id: string): Promise<void> {
    return apiFetch<void>(`/companies/${id}`, {
        method: 'DELETE',
    });
}

// ========== BRANDS ==========

export async function getBrands(companyId?: string): Promise<Brand[]> {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiFetch<Brand[]>(`/brands${query}`);
}

export async function createBrand(brand: { name: string; companyId: string; color?: string }): Promise<Brand> {
    return apiFetch<Brand>('/brands', {
        method: 'POST',
        body: JSON.stringify(brand),
    });
}

export async function updateBrand(id: string, updates: Partial<Brand>): Promise<Brand> {
    return apiFetch<Brand>(`/brands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function deleteBrand(id: string): Promise<void> {
    return apiFetch<void>(`/brands/${id}`, {
        method: 'DELETE',
    });
}

// ========== TEAMS ==========

export async function getTeams(companyId?: string): Promise<Team[]> {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiFetch<Team[]>(`/teams${query}`);
}

export async function createTeam(team: { name: string; brandId?: string; country?: string }): Promise<Team> {
    return apiFetch<Team>('/teams', {
        method: 'POST',
        body: JSON.stringify(team),
    });
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    return apiFetch<Team>(`/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function deleteTeam(id: string): Promise<void> {
    return apiFetch<void>(`/teams/${id}`, {
        method: 'DELETE',
    });
}

// ========== AGENTS ==========

export async function getAgents(companyId?: string): Promise<Agent[]> {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiFetch<Agent[]>(`/agents${query}`);
}

export async function createAgent(agent: { 
    name: string; 
    teamId: string; 
    userId?: string;
    email?: string;
    role?: string;
    autonomyLevel?: number;
}): Promise<Agent> {
    return apiFetch<Agent>('/agents', {
        method: 'POST',
        body: JSON.stringify(agent),
    });
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
    return apiFetch<Agent>(`/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function deleteAgent(id: string): Promise<void> {
    return apiFetch<void>(`/agents/${id}`, {
        method: 'DELETE',
    });
}

// ========== USERS ==========

export async function getUsers(companyId?: string): Promise<User[]> {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiFetch<User[]>(`/users${query}`);
}

export async function createUser(user: { 
    email: string; 
    name?: string; 
    companyId?: string; 
    teamId?: string;
    role?: string;
}): Promise<User> {
    return apiFetch<User>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
    });
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
    return apiFetch<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function deleteUser(id: string): Promise<void> {
    return apiFetch<void>(`/users/${id}`, {
        method: 'DELETE',
    });
}

// ========== MANAGED INTERFACES ==========

export async function getManagedInterfaces(): Promise<ManagedInterface[]> {
    return apiFetch<ManagedInterface[]>('/interfaces');
}

export async function createManagedInterface(iface: Omit<ManagedInterface, 'id' | 'createdAt' | 'updatedAt'>): Promise<ManagedInterface> {
    return apiFetch<ManagedInterface>('/interfaces', {
        method: 'POST',
        body: JSON.stringify(iface),
    });
}

export async function updateManagedInterface(id: string, updates: Partial<ManagedInterface>): Promise<ManagedInterface> {
    return apiFetch<ManagedInterface>(`/interfaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function deleteManagedInterface(id: string): Promise<void> {
    return apiFetch<void>(`/interfaces/${id}`, {
        method: 'DELETE',
    });
}

export async function getTeamInterfaces(teamId: string): Promise<ManagedInterface[]> {
    return apiFetch<ManagedInterface[]>(`/teams/${teamId}/interfaces`);
}

export async function setTeamInterfaces(teamId: string, interfaceIds: string[]): Promise<void> {
    return apiFetch<void>(`/teams/${teamId}/interfaces`, {
        method: 'PUT',
        body: JSON.stringify({ interfaceIds }),
    });
}

export async function getTeamDetails(teamId: string): Promise<Team> {
    return apiFetch<Team>(`/teams/${teamId}`);
}

// ========== WORKFLOWS ==========

export async function getWorkflows(): Promise<Workflow[]> {
    return apiFetch<Workflow[]>('/workflows');
}

export async function createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    return apiFetch<Workflow>('/workflows', {
        method: 'POST',
        body: JSON.stringify(workflow),
    });
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    return apiFetch<Workflow>(`/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function deleteWorkflow(id: string): Promise<void> {
    return apiFetch<void>(`/workflows/${id}`, {
        method: 'DELETE',
    });
}

// ========== PROVIDER CATALOG ==========

export async function getProviderCatalog(): Promise<ProviderCatalogEntry[]> {
    return apiFetch<ProviderCatalogEntry[]>('/provider-catalog');
}

export async function upsertProviderCatalog(entries: ProviderCatalogEntry[]): Promise<ProviderCatalogEntry[]> {
    return apiFetch<ProviderCatalogEntry[]>('/provider-catalog', {
        method: 'PUT',
        body: JSON.stringify(entries),
    });
}

// ========== TENANT PROVIDER CONFIG ==========

export async function getTenantProviderConfig(companyId: string): Promise<TenantProviderConfig[]> {
    return apiFetch<TenantProviderConfig[]>(`/tenant-provider-config?companyId=${companyId}`);
}

export async function upsertTenantProviderConfig(entries: Omit<TenantProviderConfig, 'providerCatalog'>[]): Promise<TenantProviderConfig[]> {
    return apiFetch<TenantProviderConfig[]>('/tenant-provider-config', {
        method: 'PUT',
        body: JSON.stringify(entries),
    });
}

// ========== TENANT VOICE PROFILES ==========

export async function getTenantVoiceProfiles(companyId: string): Promise<TenantVoiceProfile[]> {
    return apiFetch<TenantVoiceProfile[]>(`/voice-profiles?companyId=${companyId}`);
}

export async function createTenantVoiceProfile(profile: Omit<TenantVoiceProfile, 'id' | 'providerCatalog' | 'createdAt' | 'updatedAt'>): Promise<TenantVoiceProfile> {
    return apiFetch<TenantVoiceProfile>('/voice-profiles', {
        method: 'POST',
        body: JSON.stringify(profile),
    });
}

export async function updateTenantVoiceProfile(id: string, updates: Partial<TenantVoiceProfile>): Promise<TenantVoiceProfile> {
    return apiFetch<TenantVoiceProfile>(`/voice-profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function deleteTenantVoiceProfile(id: string): Promise<void> {
    return apiFetch<void>(`/voice-profiles/${id}`, {
        method: 'DELETE',
    });
}

// ========== SESSIONS (for stats pages) ==========

export async function getSessions(companyId?: string, limit = 100): Promise<Session[]> {
    let query = `?limit=${limit}`;
    if (companyId) query += `&companyId=${companyId}`;
    return apiFetch<Session[]>(`/sessions${query}`);
}

export async function getSession(id: string): Promise<Session> {
    return apiFetch<Session>(`/sessions/${id}`);
}

// Legacy export for backwards compatibility with existing code
export const supabase = null;
