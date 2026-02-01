import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Phase 1 working authentication service
// Simulates Supabase-like responses but with proper structure

@Injectable()
export class Phase1AuthService {
  private readonly config: ConfigService;
  private users = new Map();

  constructor(config: ConfigService) {
    this.config = config;
    
    // Pre-populate with test users
    this.users.set('admin@keledon.com', {
      id: 'admin-user-id',
      email: 'admin@keledon.com',
      role: 'admin',
      user_metadata: { name: 'Admin User' }
    });
    
    this.users.set('user@keledon.com', {
      id: 'user-user-id',
      email: 'user@keledon.com',
      role: 'user',
      user_metadata: { name: 'Regular User' }
    });
  }

  async signIn(email: string, password: string) {
    console.log(`[PHASE1 AUTH] Real login attempt: ${email}`);
    
    const user = this.users.get(email);
    
    if (user && password === 'phase1-password') {
      console.log(`[PHASE1 AUTH] Login successful for: ${email}`);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: { name: user.user_metadata?.name || user.email }
        },
        session: {
          access_token: `phase1-token-${Date.now()}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };
    }
    
    throw new Error(`Login failed: Invalid credentials`);
  }

  async getCurrentUser() {
    // For now, return a test user
    console.log('[PHASE1 AUTH] Get current user - returning test user');
    
    return {
      id: 'user-user-id',
      email: 'user@keledon.com',
      user_metadata: { name: 'Phase 1 Test User' }
    };
  }

  async signOut() {
    console.log('[PHASE1 AUTH] Sign out successful');
  }

  async verifyToken(token: string) {
    console.log(`[PHASE1 AUTH] Verify token: ${token}`);
    
    if (token && token.startsWith('phase1-token-')) {
      return {
        user: {
          id: 'user-user-id',
          email: 'user@keledon.com',
          user_metadata: { name: 'Phase 1 Test User' }
        },
        valid: true
      };
    }
    
    return { valid: false, user: null };
  }
}