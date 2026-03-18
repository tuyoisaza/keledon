import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

interface SimpleUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  company_id?: string;
  team_id?: string;
  role?: string;
  last_session?: string;
}

@Injectable()
export class LocalAuthService {
  private usersFile = '/app/data/google_users.json';
  private users: SimpleUser[] = [];

  constructor() {
    this.loadUsers();
  }

  private loadUsers() {
    try {
      if (fs.existsSync(this.usersFile)) {
        this.users = JSON.parse(fs.readFileSync(this.usersFile, 'utf-8'));
      }
    } catch (e) {
      this.users = [];
    }
  }

  private saveUsers() {
    const dir = '/app/data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2));
  }

  async findOrCreateGoogleUser(googleUser: any): Promise<SimpleUser> {
    let user = this.users.find(u => u.email === googleUser.email);
    
    if (!user) {
      user = {
        id: 'google_' + Date.now(),
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        provider: 'google',
        company_id: 'default-company',
        role: 'superadmin',
      };
      this.users.push(user);
    }
    user.last_session = new Date().toISOString();
    this.saveUsers();
    
    return user;
  }

  async register(email: string, password: string, name?: string) {
    const user: SimpleUser = {
      id: 'user_' + Date.now(),
      email,
      name: name || email.split('@')[0],
      provider: 'email',
    };
    this.users.push(user);
    this.saveUsers();
    return { id: user.id, email: user.email, name: user.name };
  }

  async login(email: string, password: string) {
    const user = this.users.find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    user.last_session = new Date().toISOString();
    this.saveUsers();
    
    // Also check crud.json for additional user data (company, team assignments)
    const crudData = await this.getCrudData();
    const crudUser = crudData.users?.find((u: any) => u.email === email);
    
    return { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: crudUser?.role || user.role || 'admin',
      company_id: crudUser?.company_id || user.company_id,
      team_id: crudUser?.team_id || user.team_id,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      if (!payload.userId || !payload.expiresAt) {
        return null;
      }
      if (Date.now() > payload.expiresAt) {
        return null;
      }
      const user = this.users.find(u => u.id === payload.userId);
      if (!user) return null;
      
      // Also check crud.json for additional user data
      const crudData = await this.getCrudData();
      const crudUser = crudData.users?.find((u: any) => u.email === user.email);
      
      return { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: crudUser?.role || user.role || 'admin',
        company_id: crudUser?.company_id || user.company_id,
        team_id: crudUser?.team_id || user.team_id,
        brand_id: crudUser?.brand_id,
        last_session: user.last_session,
      };
    } catch {
      return null;
    }
  }

  generateToken(userId: string): string {
    const payload = {
      userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  async getCrudData() {
    try {
      const dataFile = '/app/data/crud.json';
      if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed to load CRUD data:', e);
    }
    return { companies: [], brands: [], teams: [] };
  }
}
