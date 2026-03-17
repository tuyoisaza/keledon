import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

interface Company {
  id: string;
  name: string;
  industry?: string;
  countries?: string[];
  created_at: string;
}

interface Brand {
  id: string;
  name: string;
  company_id: string;
  color?: string;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  brand_id?: string;
  company_id: string;
  country?: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  company_id?: string;
  team_id?: string;
  role?: string;
  created_at: string;
}

interface DataStore {
  companies: Company[];
  brands: Brand[];
  teams: Team[];
  users: User[];
}

@Injectable()
export class CrudService {
  private dataFile = '/app/data/crud.json';
  private data: DataStore;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DataStore {
    try {
      if (fs.existsSync(this.dataFile)) {
        return JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    return { companies: [], brands: [], teams: [], users: [] };
  }

  private saveData() {
    const dir = '/app/data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
  }

  // Companies
  getCompanies() { return this.data.companies; }
  
  getCompany(id: string) { 
    return this.data.companies.find(c => c.id === id) || null;
  }
  
  createCompany(data: Partial<Company>) {
    const company: Company = {
      id: 'company_' + Date.now(),
      name: data.name || '',
      industry: data.industry,
      countries: data.countries || [],
      created_at: new Date().toISOString(),
    };
    this.data.companies.push(company);
    this.saveData();
    return company;
  }

  updateCompany(id: string, data: Partial<Company>) {
    const idx = this.data.companies.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.data.companies[idx] = { ...this.data.companies[idx], ...data };
      this.saveData();
      return this.data.companies[idx];
    }
    return null;
  }

  deleteCompany(id: string) {
    this.data.companies = this.data.companies.filter(c => c.id !== id);
    this.data.brands = this.data.brands.filter(b => b.company_id !== id);
    this.data.teams = this.data.teams.filter(t => t.company_id !== id);
    this.saveData();
  }

  // Brands - with company join
  getBrands() { 
    return this.data.brands.map(brand => ({
      ...brand,
      company: this.data.companies.find(c => c.id === brand.company_id)
    }));
  }

  createBrand(data: Partial<Brand>) {
    const brand: Brand = {
      id: 'brand_' + Date.now(),
      name: data.name || '',
      company_id: data.company_id || '',
      color: data.color,
      created_at: new Date().toISOString(),
    };
    this.data.brands.push(brand);
    this.saveData();
    return brand;
  }

  updateBrand(id: string, data: Partial<Brand>) {
    const idx = this.data.brands.findIndex(b => b.id === id);
    if (idx >= 0) {
      this.data.brands[idx] = { ...this.data.brands[idx], ...data };
      this.saveData();
      return this.data.brands[idx];
    }
    return null;
  }

  deleteBrand(id: string) {
    this.data.brands = this.data.brands.filter(b => b.id !== id);
    this.saveData();
  }

  // Teams - with company and brand join
  getTeams() { 
    return this.data.teams.map(team => ({
      ...team,
      company: this.data.companies.find(c => c.id === team.company_id),
      brand: this.data.brands.find(b => b.id === team.brand_id)
    }));
  }

  createTeam(data: Partial<Team>) {
    const team: Team = {
      id: 'team_' + Date.now(),
      name: data.name || '',
      brand_id: data.brand_id,
      company_id: data.company_id || '',
      country: data.country,
      created_at: new Date().toISOString(),
    };
    this.data.teams.push(team);
    this.saveData();
    return team;
  }

  updateTeam(id: string, data: Partial<Team>) {
    const idx = this.data.teams.findIndex(t => t.id === id);
    if (idx >= 0) {
      this.data.teams[idx] = { ...this.data.teams[idx], ...data };
      this.saveData();
      return this.data.teams[idx];
    }
    return null;
  }

  deleteTeam(id: string) {
    this.data.teams = this.data.teams.filter(t => t.id !== id);
    this.saveData();
  }

  // Users - with company and team join
  getUsers() { 
    return this.data.users.map(user => ({
      ...user,
      company: this.data.companies.find(c => c.id === user.company_id),
      team: this.data.teams.find(t => t.id === user.team_id)
    }));
  }

  createUser(data: Partial<User>) {
    const user: User = {
      id: 'user_' + Date.now(),
      email: data.email || '',
      name: data.name || '',
      company_id: data.company_id,
      team_id: data.team_id,
      role: data.role || 'user',
      created_at: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  updateUser(id: string, data: Partial<User>) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx >= 0) {
      this.data.users[idx] = { ...this.data.users[idx], ...data };
      this.saveData();
      return this.data.users[idx];
    }
    return null;
  }

  deleteUser(id: string) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.saveData();
  }
}
