/**
 * CRUD API Client for KELEDON
 * Uses the cloud backend API instead of Supabase
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

// Companies
export async function getCompanies() {
    return fetchApi('/companies');
}

export async function createCompany(data: any) {
    return fetchApi('/companies', 'POST', data);
}

export async function updateCompany(id: string, data: any) {
    return fetchApi(`/companies/${id}`, 'PUT', data);
}

export async function deleteCompany(id: string) {
    return fetchApi(`/companies/${id}`, 'DELETE');
}

// Brands
export async function getBrands(companyId?: string) {
    const brands = await fetchApi('/brands');
    if (companyId) {
        return brands.filter((b: any) => b.company_id === companyId);
    }
    return brands;
}

export async function createBrand(data: any) {
    return fetchApi('/brands', 'POST', data);
}

export async function updateBrand(id: string, data: any) {
    return fetchApi(`/brands/${id}`, 'PUT', data);
}

export async function deleteBrand(id: string) {
    return fetchApi(`/brands/${id}`, 'DELETE');
}

// Teams
export async function getTeams(companyId?: string, brandId?: string) {
    const teams = await fetchApi('/teams');
    let filtered = teams;
    if (companyId) {
        filtered = filtered.filter((t: any) => t.company_id === companyId);
    }
    if (brandId) {
        filtered = filtered.filter((t: any) => t.brand_id === brandId);
    }
    return filtered;
}

export async function createTeam(data: any) {
    return fetchApi('/teams', 'POST', data);
}

export async function updateTeam(id: string, data: any) {
    return fetchApi(`/teams/${id}`, 'PUT', data);
}

export async function deleteTeam(id: string) {
    return fetchApi(`/teams/${id}`, 'DELETE');
}

// Users
export async function getUsers(companyId?: string) {
    const users = await fetchApi('/users');
    if (companyId) {
        return users.filter((u: any) => u.company_id === companyId);
    }
    return users;
}

export async function createUser(data: any) {
    return fetchApi('/users', 'POST', data);
}

export async function updateUser(id: string, data: any) {
    return fetchApi(`/users/${id}`, 'PUT', data);
}

export async function deleteUser(id: string) {
    return fetchApi(`/users/${id}`, 'DELETE');
}

// Agents (placeholder - not implemented in backend yet)
export async function getAgents(companyId?: string) {
    return getUsers(companyId); // Reuse users for now
}

export async function createAgent(data: any) {
    return createUser({ ...data, role: 'agent' });
}

export async function updateAgent(id: string, data: any) {
    return updateUser(id, data);
}

export async function deleteAgent(id: string) {
    return deleteUser(id);
}

// Categories
export async function getCategories(companyId?: string) {
    const categories = await fetchApi('/categories');
    if (companyId) {
        return categories.filter((c: any) => c.company_id === companyId);
    }
    return categories;
}

export async function createCategory(data: any) {
    return fetchApi('/categories', 'POST', data);
}

export async function updateCategory(id: string, data: any) {
    return fetchApi(`/categories/${id}`, 'PUT', data);
}

export async function deleteCategory(id: string) {
    return fetchApi(`/categories/${id}`, 'DELETE');
}

// Placeholder exports for other functions that might be needed
export async function addCompanyCountry(companyId: string, countryCode: string) {
    const company = await fetchApi(`/companies/${companyId}`);
    const countries = company.countries || [];
    if (!countries.includes(countryCode)) {
        countries.push(countryCode);
        await updateCompany(companyId, { countries });
    }
}

export async function removeCompanyCountry(companyId: string, countryCode: string) {
    const company = await fetchApi(`/companies/${companyId}`);
    const countries = (company.countries || []).filter((c: string) => c !== countryCode);
    await updateCompany(companyId, { countries });
}

export async function getTeamDetails(teamId: string) {
    const teams = await fetchApi('/teams');
    return teams.find((t: any) => t.id === teamId);
}

// Provider-related (placeholder - would need backend implementation)
export async function getProviderCatalog() { return []; }
export async function upsertProviderCatalog(data: any) { return data; }
export async function getTenantProviderConfig(companyId: string) { return []; }
export async function upsertTenantProviderConfig(data: any) { return data; }
export async function getTenantVoiceProfiles(companyId: string) { return []; }
export async function createTenantVoiceProfile(data: any) { return data; }
export async function updateTenantVoiceProfile(id: string, data: any) { return data; }
export async function deleteTenantVoiceProfile(id: string) { return true; }

// Type exports
export type Company = { id: string; name: string; industry?: string; countries?: string[] };
export type Brand = { id: string; name: string; company_id: string; color?: string };
export type Team = { id: string; name: string; company_id: string; brand_id?: string; country?: string };
export type Category = { id: string; name: string; color: string; description?: string; company_id: string };
export type ProviderCatalogEntry = any;
export type TenantProviderConfig = any;
export type TenantVoiceProfile = any;
export type ProviderType = 'stt' | 'tts' | 'rpa';
