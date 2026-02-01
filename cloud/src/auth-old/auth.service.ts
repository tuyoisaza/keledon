import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async signUp(email: string, password: string, name?: string) {
    return await this.supabaseService.signUp(email, password, name);
  }

  async signIn(email: string, password: string) {
    return await this.supabaseService.signIn(email, password);
  }

  async signOut(token?: string) {
    return await this.supabaseService.signOut(token);
  }

  async verifyToken(token: string) {
    return await this.supabaseService.verifyToken(token);
  }

  async getCurrentUser() {
    return await this.supabaseService.getCurrentUser();
  }

  async resetPassword(email: string) {
    return await this.supabaseService.resetPassword(email);
  }

  async refreshToken(refreshToken: string) {
    return await this.supabaseService.refreshToken(refreshToken);
  }

  async createSession(userId: string, metadata?: any) {
    return await this.supabaseService.createSession(userId, metadata);
  }

  async getSession(sessionId: string) {
    return await this.supabaseService.getSession(sessionId);
  }

  async updateSession(sessionId: string, updates: any) {
    return await this.supabaseService.updateSession(sessionId, updates);
  }
}