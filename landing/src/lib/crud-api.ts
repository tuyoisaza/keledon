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
    createdAt?: string;
    updatedAt?: string;
    team?: { id: string; name: string; brand?: { id: string; name: string; companyId: string } };
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
        return teams.filter(t => t.brand?.companyId === companyId);
    }
    return teams;
}

export async function createTeam(data: { name: string; brandId?: string; country?: string }): Promise<Team> {
    return fetchApi('/teams', 'POST', data);
}

export async function updateTeam(id: string, data: { name?: string; country?: string }): Promise<Team> {
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

// Agents
export async function getAgents(companyId?: string): Promise<Agent[]> {
    const agents: Agent[] = await fetchApi('/agents');
    if (companyId) {
        return agents.filter(a => a.team?.brand?.companyId === companyId);
    }
    return agents;
}

export async function createAgent(data: { name: string; teamId: string; userId?: string; email?: string; role?: string }): Promise<Agent> {
    return fetchApi('/agents', 'POST', data);
}

export async function updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
    return fetchApi(`/agents/${id}`, 'PUT', data);
}

export async function deleteAgent(id: string): Promise<void> {
    return fetchApi(`/agents/${id}`, 'DELETE');
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
