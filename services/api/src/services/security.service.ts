import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import * as crypto from 'crypto';

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiration: string;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  enableTwoFactor: boolean;
  enableIPWhitelist: boolean;
  enableRateLimiting: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export type SecurityEventType = 
  | 'login_success'
  | 'login_failed'
  | 'login_locked'
  | 'logout'
  | 'session_expired'
  | 'password_changed'
  | 'two_factor_enabled'
  | 'two_factor_failed'
  | 'permission_denied'
  | 'rate_limit_exceeded'
  | 'ip_blocked'
  | 'suspicious_activity'
  | 'security_breach'
  | 'data_access'
  | 'admin_action';

@Injectable()
export class SecurityService implements OnModuleInit {
  private config: SecurityConfig;
  private users = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private securityEvents = new Map<string, SecurityEvent>();
  private securityEventSubject = new Subject<SecurityEvent>();
  public securityEvents$ = this.securityEventSubject.asObservable();

  constructor() {
    this.config = this.loadSecurityConfig();
    console.log('SecurityService: Initialized with advanced security features');
  }

  onModuleInit() {
    this.initializeDefaultUsers();
    this.startSecurityMonitoring();
    console.log('SecurityService: Security monitoring started');
  }

  async authenticate(email: string, password: string, context: {
    ipAddress: string;
    userAgent: string;
  }): Promise<{ success: boolean; user?: User; session?: Session; error?: string }> {
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      await this.logSecurityEvent('login_failed', 'medium', context.ipAddress, context.userAgent, 
        'User not found', { email });
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.isActive) {
      await this.logSecurityEvent('login_failed', 'medium', context.ipAddress, context.userAgent, 
        'User account inactive', { userId: user.id });
      return { success: false, error: 'Account inactive' };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.logSecurityEvent('login_locked', 'high', context.ipAddress, context.userAgent, 
        'User account locked', { userId: user.id, lockedUntil: user.lockedUntil });
      return { success: false, error: 'Account locked' };
    }

    const isPasswordValid = await this.verifyPassword(password, user.metadata.passwordHash || '');
    
    if (!isPasswordValid) {
      user.loginAttempts++;
      if (user.loginAttempts >= this.config.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + this.config.lockoutDuration * 60 * 1000);
        await this.logSecurityEvent('login_locked', 'high', context.ipAddress, context.userAgent, 
          'Account locked due to too many failed attempts', { userId: user.id });
      } else {
        await this.logSecurityEvent('login_failed', 'medium', context.ipAddress, context.userAgent, 
          'Invalid password', { userId: user.id, attempts: user.loginAttempts });
      }
      
      await this.updateUser(user);
      return { success: false, error: 'Invalid credentials' };
    }

    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLogin = new Date();
    await this.updateUser(user);

    const session = await this.createSession(user.id, context);

    await this.logSecurityEvent('login_success', 'low', context.ipAddress, context.userAgent, 
      'User authenticated successfully', { userId: user.id, sessionId: session.id });

    return { 
      success: true, 
      user: this.sanitizeUser(user), 
      session 
    };
  }

  async createSession(userId: string, context: {
    ipAddress: string;
    userAgent: string;
  }): Promise<Session> {
    const sessionId = this.generateId();
    const token = await this.generateJWT(userId);
    const refreshToken = this.generateId();

    const session: Session = {
      id: sessionId,
      userId,
      token,
      refreshToken,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      isActive: true,
      expiresAt: new Date(Date.now() + this.parseExpiration(this.config.jwtExpiration)),
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata: {}
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async validateSession(sessionId: string, context: {
    ipAddress: string;
    userAgent: string;
  }): Promise<{ valid: boolean; user?: User; session?: Session }> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return { valid: false };
    }

    if (session.expiresAt < new Date()) {
      session.isActive = false;
      await this.logSecurityEvent('session_expired', 'medium', context.ipAddress, context.userAgent, 
        'Session expired', { sessionId });
      return { valid: false };
    }

    if (session.ipAddress !== context.ipAddress) {
      await this.logSecurityEvent('suspicious_activity', 'high', context.ipAddress, context.userAgent, 
        'IP address changed during session', { 
          sessionId, 
          originalIP: session.ipAddress,
          newIP: context.ipAddress 
        });
    }

    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    const user = await this.getUserById(session.userId);
    if (!user || !user.isActive) {
      return { valid: false };
    }

    return { 
      valid: true, 
      user: this.sanitizeUser(user), 
      session 
    };
  }

  async revokeSession(sessionId: string, reason?: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    await this.logSecurityEvent('logout', 'low', session.ipAddress, session.userAgent, 
      reason || 'Session revoked', { sessionId, userId: session.userId });

    return true;
  }

  async getSecurityEvents(filters: {
    type?: SecurityEventType[];
    severity?: string[];
    userId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<SecurityEvent[]> {
    let events = Array.from(this.securityEvents.values());

    // Apply filters
    if (filters.type) {
      events = events.filter(e => filters.type!.includes(e.type));
    }
    if (filters.severity) {
      events = events.filter(e => filters.severity!.includes(e.severity));
    }
    if (filters.userId) {
      events = events.filter(e => e.userId === filters.userId);
    }
    if (filters.from) {
      events = events.filter(e => e.timestamp >= filters.from!);
    }
    if (filters.to) {
      events = events.filter(e => e.timestamp <= filters.to!);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Pagination
    if (filters.offset) {
      events = events.slice(filters.offset);
    }
    if (filters.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  private loadSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      jwtExpiration: process.env.JWT_EXPIRATION || '24h',
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
      passwordRequireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '30'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '60'),
      enableTwoFactor: process.env.ENABLE_TWO_FACTOR === 'true',
      enableIPWhitelist: process.env.ENABLE_IP_WHITELIST === 'true',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15'),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
    };
  }

  private initializeDefaultUsers(): void {
    // Create default super admin if no users exist
    if (this.users.size === 0) {
      const defaultAdmin: User = {
        id: 'admin_default',
        email: 'admin@keledon.com',
        username: 'admin',
        name: 'System Administrator',
        role: 'super_admin',
        permissions: ['*'],
        isActive: true,
        isEmailVerified: true,
        twoFactorEnabled: false,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          passwordHash: '$2b$10$default.hash.change.in.production', // Change this in production
        }
      };

      this.users.set(defaultAdmin.id, defaultAdmin);
      console.log('SecurityService: Created default admin user (change password in production)');
    }
  }

  private startSecurityMonitoring(): void {
    // Clean up expired sessions every hour
    interval(60 * 60 * 1000).subscribe(() => {
      this.cleanupExpiredSessions();
    });

    // Archive old security events every 24 hours
    interval(24 * 60 * 60 * 1000).subscribe(() => {
      this.archiveOldSecurityEvents();
    });
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now || !session.isActive) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`SecurityService: Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  private async archiveOldSecurityEvents(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

    let archivedCount = 0;
    for (const [eventId, event] of this.securityEvents.entries()) {
      if (event.timestamp < cutoffDate) {
        this.securityEvents.delete(eventId);
        archivedCount++;
      }
    }

    if (archivedCount > 0) {
      console.log(`SecurityService: Archived ${archivedCount} old security events`);
    }
  }

  private async logSecurityEvent(
    type: SecurityEventType,
    severity: SecurityEvent['severity'],
    ipAddress: string,
    userAgent: string,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const event: SecurityEvent = {
      id: this.generateId(),
      type,
      severity,
      ipAddress,
      userAgent,
      description,
      metadata,
      timestamp: new Date(),
      resolved: false
    };

    this.securityEvents.set(event.id, event);
    this.securityEventSubject.next(event);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  private async generateJWT(userId: string): Promise<string> {
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiration(this.config.jwtExpiration)
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600; // Default to 1 hour
    }
  }

  private async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  private async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  private async updateUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  private sanitizeUser(user: User): User {
    const { metadata, ...sanitized } = user;
    return {
      ...sanitized,
      metadata: {
        ...metadata,
        passwordHash: undefined // Never return password hash
      }
    } as User;
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}