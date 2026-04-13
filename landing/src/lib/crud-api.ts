/**
 * CRUD API Client for KELEDON
 * Uses the cloud backend API (Prisma) - returns camelCase properties
 */

import { API_URL } from './config';

const CRUD_API = `${API_URL}/api/crud`;

async function fetchApi(endpoint: string, method = 'GET', body?: any) {
    const response = await fetch(`${CRUD_API}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text || response.statusText}`);
    }
    return response.json();
}

// Type definitions (matching Prisma schema - camelCase)
export interface Company {
    id: string;
    name: string;
    industry?: string;
    createdAt?: string;
    updatedAt?: string;
    countries?: CompanyCountry[];
}

export interface CompanyCountry {
    id?: string;
    companyId: string;
    countryCode: string;
}

export interface Brand {
    id: string;
    companyId: string;
    name: string;
    color?: string;
    createdAt?: string;
    updatedAt?: string;
    company?: { id: string; name: string };
}

export interface Team {
    id: string;
    name: string;
    brandId?: string;
    country?: string;
    sttProvider?: string;
    ttsProvider?: string;
    createdAt?: string;
    updatedAt?: string;
    brand?: { id: string; name: string; color?: string; companyId?: string };
    company?: { id: string; name: string };
    _count?: { users: number; keledons: number };
}

export interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    companyId?: string;
    teamId?: string;
    brandId?: string;
    isOnline?: boolean;
    lastLogin?: string;
    createdAt?: string;
    updatedAt?: string;
    company?: { id: string; name: string };
    team?: { id: string; name: string; brandId?: string; brand?: { id: string; name: string } };
}

export interface Keledon {
    id: string;
    teamId: string;
    brandId?: string;
    countryCode?: string;
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
    uiInterfaces?: string;
    createdAt?: string;
    updatedAt?: string;
    team?: { id: string; name: string; country?: string; brandId?: string; brand?: { id: string; name: string; companyId: string } };
    user?: { id: string; name: string; email: string };
}

export interface ManagedInterface {
    id: string;
    name: string;
    baseUrl: string;
    category?: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProviderCatalogEntry {
    id: string;
    type: string;
    name: string;
    status?: string;
    isEnabled: boolean;
}

export interface TenantProviderConfig {
    id: string;
    companyId: string;
    providerId: string;
    providerType: string;
    isEnabled: boolean;
    isDefault: boolean;
}

export interface TenantVoiceProfile {
    id: string;
    companyId: string;
    providerId: string;
    name: string;
    language?: string;
    isEnabled: boolean;
    isDefault: boolean;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    description?: string;
    companyId: string;
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
}

// Companies
export async function getCompanies(): Promise<Company[]> {
    return fetchApi('/companies');
}

export async function createCompany(data: { name: string; industry?: string }): Promise<Company> {
    return fetchApi('/companies', 'POST', data);
}

export async function updateCompany(id: string, data: { name?: string; industry?: string; countries?: string[] }): Promise<Company> {
    return fetchApi(`/companies/${id}`, 'PUT', data);
}

export async function deleteCompany(id: string): Promise<void> {
    return fetchApi(`/companies/${id}`, 'DELETE');
}

// Brands
export async function getBrands(companyId?: string): Promise<Brand[]> {
    const brands: Brand[] = await fetchApi('/brands');
    if (companyId) {
        return brands.filter(b => b.companyId === companyId);
    }
    return brands;
}

export async function createBrand(data: { name: string; companyId: string; color?: string }): Promise<Brand> {
    return fetchApi('/brands', 'POST', data);
}

export async function updateBrand(id: string, data: { name?: string; color?: string }): Promise<Brand> {
    return fetchApi(`/brands/${id}`, 'PUT', data);
}

export async function deleteBrand(id: string): Promise<void> {
    return fetchApi(`/brands/${id}`, 'DELETE');
}

// Teams
export async function getTeams(companyId?: string): Promise<Team[]> {
    const teams: Team[] = await fetchApi('/teams');
    if (companyId) {
        return teams.filter(t => t.brand?.company?.id === companyId);
    }
    return teams;
}

export async function createTeam(data: { name: string; companyId?: string; brandId?: string; country?: string }): Promise<Team> {
    return fetchApi('/teams', 'POST', data);
}

export async function updateTeam(id: string, data: { name?: string; companyId?: string; brandId?: string; country?: string }): Promise<Team> {
    return fetchApi(`/teams/${id}`, 'PUT', data);
}

export async function deleteTeam(id: string): Promise<void> {
    return fetchApi(`/teams/${id}`, 'DELETE');
}

// Users
export async function getUsers(companyId?: string): Promise<User[]> {
    const users: User[] = await fetchApi('/users');
    if (companyId) {
        return users.filter(u => u.companyId === companyId);
    }
    return users;
}

export async function createUser(data: { email: string; name?: string; companyId?: string; brandId?: string; teamId?: string; role?: string }): Promise<User> {
    const { brandId, ...rest } = data;
    return fetchApi('/users', 'POST', rest);
}

export async function updateUser(id: string, data: { email?: string; name?: string; companyId?: string; brandId?: string; teamId?: string; role?: string }): Promise<User> {
    const { brandId, ...rest } = data;
    return fetchApi(`/users/${id}`, 'PUT', rest);
}

export async function deleteUser(id: string): Promise<void> {
    return fetchApi(`/users/${id}`, 'DELETE');
}

// KELEDONS
export async function getKeledons(companyId?: string): Promise<Keledon[]> {
    const keledons: Keledon[] = await fetchApi('/keledons');
    if (companyId) {
        return keledons.filter(k => k.team?.brand?.companyId === companyId);
    }
    return keledons;
}

export async function createKeledon(data: { name: string; teamId: string; brandId?: string; countryCode?: string; userId?: string; email?: string; role?: string; autonomyLevel?: number; uiInterfaces?: string[] }): Promise<Keledon> {
    return fetchApi('/keledons', 'POST', data);
}

export async function updateKeledon(id: string, data: Partial<Keledon>): Promise<Keledon> {
    return fetchApi(`/keledons/${id}`, 'PUT', data);
}

export async function deleteKeledon(id: string): Promise<void> {
    return fetchApi(`/keledons/${id}`, 'DELETE');
}

// Managed Interfaces
export async function getManagedInterfaces(): Promise<ManagedInterface[]> {
    return fetchApi('/interfaces');
}

export async function getTeamInterfaces(teamId: string): Promise<ManagedInterface[]> {
    return fetchApi(`/teams/${teamId}/interfaces`);
}

// Sessions
export async function getSessions(companyId?: string, limit = 100): Promise<Session[]> {
    let endpoint = `/sessions?limit=${limit}`;
    if (companyId) endpoint += `&companyId=${companyId}`;
    return fetchApi(endpoint);
}

export async function getSession(id: string): Promise<Session> {
    return fetchApi(`/sessions/${id}`);
}

export async function getOrphanedSessionCount(): Promise<number> {
    return fetchApi('/sessions/orphaned/count');
}

export async function deleteOrphanedSessions(): Promise<{ deleted: number }> {
    return fetchApi('/sessions/orphaned', 'DELETE');
}

// Provider Catalog
export async function getProviderCatalog(): Promise<ProviderCatalogEntry[]> {
    return fetchApi('/provider-catalog');
}

export async function upsertProviderCatalog(data: ProviderCatalogEntry[]): Promise<ProviderCatalogEntry[]> {
    return fetchApi('/provider-catalog', 'PUT', data);
}

// Tenant Provider Config
export async function getTenantProviderConfig(companyId: string): Promise<TenantProviderConfig[]> {
    return fetchApi(`/tenant-provider-config?companyId=${companyId}`);
}

export async function upsertTenantProviderConfig(data: Omit<TenantProviderConfig, 'id'>[]): Promise<TenantProviderConfig[]> {
    return fetchApi('/tenant-provider-config', 'PUT', data);
}

// Tenant Voice Profiles
export async function getTenantVoiceProfiles(companyId: string): Promise<TenantVoiceProfile[]> {
    return fetchApi(`/voice-profiles?companyId=${companyId}`);
}

export async function createTenantVoiceProfile(data: Omit<TenantVoiceProfile, 'id'>): Promise<TenantVoiceProfile> {
    return fetchApi('/voice-profiles', 'POST', data);
}

export async function updateTenantVoiceProfile(id: string, data: Partial<TenantVoiceProfile>): Promise<TenantVoiceProfile> {
    return fetchApi(`/voice-profiles/${id}`, 'PUT', data);
}

export async function deleteTenantVoiceProfile(id: string): Promise<void> {
    return fetchApi(`/voice-profiles/${id}`, 'DELETE');
}

// Team Details
export async function getTeamDetails(teamId: string): Promise<Team> {
    return fetchApi(`/teams/${teamId}`);
}

// Categories
export async function getCategories(companyId?: string): Promise<Category[]> {
    const categories: Category[] = await fetchApi('/categories');
    if (companyId) {
        return categories.filter(c => c.companyId === companyId);
    }
    return categories;
}

export async function createCategory(data: { name: string; color: string; description?: string; companyId: string }): Promise<Category> {
    return fetchApi('/categories', 'POST', data);
}

export async function updateCategory(id: string, data: { name?: string; color?: string; description?: string }): Promise<Category> {
    return fetchApi(`/categories/${id}`, 'PUT', data);
}

export async function deleteCategory(id: string): Promise<void> {
    return fetchApi(`/categories/${id}`, 'DELETE');
}

// ========== FLOWS ==========

export interface Flow {
    id: string;
    name: string;
    description?: string;
    triggerKeywords?: string;
    category?: string;
    tool?: string;
    teamId?: string;
    isActive?: boolean;
    version?: number;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    steps?: FlowStep[];
}

export interface FlowStep {
    id: string;
    flowId: string;
    order: number;
    type: string;
    selector?: string;
    selectorType?: string;
    value?: string;
    extract?: string;
    waitFor?: string;
    condition?: string;
    timeout?: number;
    optional?: boolean;
    nextStepId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export async function getFlows(): Promise<Flow[]> {
    return fetchApi('/flows', 'GET');
}

export async function getFlow(id: string): Promise<Flow> {
    return fetchApi(`/flows/${id}`, 'GET');
}

export async function createFlow(data: { name: string; description?: string; triggerKeywords?: string[]; category?: string }): Promise<Flow> {
    return fetchApi('/flows', 'POST', data);
}

export async function deleteFlow(id: string): Promise<void> {
    return fetchApi(`/flows/${id}`, 'DELETE');
}

// ========== SUBAGENTS ==========

const SUBAGENTS_API = `${API_URL}/api/subagents`;

export interface SubAgentStatus {
    id: string;
    role: string;
    status: 'idle' | 'active' | 'waiting' | 'error';
    currentTask?: SubAgentTask;
    lastActivity?: string;
}

export interface SubAgentTask {
    id: string;
    type: 'flow' | 'read' | 'write' | 'wait';
    flowId?: string;
    stepIds?: string[];
    parameters?: Record<string, any>;
    priority?: number;
}

export interface FlowExecutionResult {
    success: boolean;
    flowId: string;
    extractedData: Record<string, any>;
    executionLog: Array<{
        stepId: string;
        stepType: string;
        status: 'success' | 'failed' | 'skipped';
        duration: number;
        result?: any;
        error?: string;
    }>;
    totalDuration: number;
}

export interface InitializeSessionResponse {
    success: boolean;
    agents: SubAgentStatus[];
}

export async function initializeSessionAgents(sessionId: string): Promise<InitializeSessionResponse> {
    const response = await fetch(`${SUBAGENTS_API}/session/${sessionId}/init`, { method: 'POST' });
    if (!response.ok) throw new Error(`Failed to initialize agents: ${response.statusText}`);
    return response.json();
}

export async function cleanupSessionAgents(sessionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${SUBAGENTS_API}/session/${sessionId}/cleanup`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Failed to cleanup agents: ${response.statusText}`);
    return response.json();
}

export async function getSessionAgents(sessionId: string): Promise<SubAgentStatus[]> {
    const response = await fetch(`${SUBAGENTS_API}/session/${sessionId}`);
    if (!response.ok) throw new Error(`Failed to get agents: ${response.statusText}`);
    return response.json();
}

export async function getAllAgentStatuses(): Promise<SubAgentStatus[]> {
    const response = await fetch(`${SUBAGENTS_API}/status`);
    if (!response.ok) throw new Error(`Failed to get agent statuses: ${response.statusText}`);
    return response.json();
}

export async function executeFlow(flowId: string, sessionId: string, parameters?: Record<string, any>): Promise<FlowExecutionResult> {
    const response = await fetch(`${SUBAGENTS_API}/execute/flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId, sessionId, parameters: parameters || {} }),
    });
    if (!response.ok) throw new Error(`Failed to execute flow: ${response.statusText}`);
    return response.json();
}

export async function executeParallelFlows(flowIds: string[], sessionId: string, parameters?: Record<string, any>): Promise<FlowExecutionResult[]> {
    const response = await fetch(`${SUBAGENTS_API}/execute/parallel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowIds, sessionId, parameters: parameters || {} }),
    });
    if (!response.ok) throw new Error(`Failed to execute parallel flows: ${response.statusText}`);
    return response.json();
}

export async function getFlowRunStatus(runId: string): Promise<any> {
    const response = await fetch(`${SUBAGENTS_API}/flow-runs/${runId}`);
    if (!response.ok) throw new Error(`Failed to get flow run status: ${response.statusText}`);
    return response.json();
}
