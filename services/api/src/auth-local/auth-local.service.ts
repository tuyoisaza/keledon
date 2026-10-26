import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { isAccountActive, isAccountSessionCurrent } from './account-lifecycle.policy';

@Injectable()
export class LocalAuthService {
  private readonly authSecret: string;
  private readonly googleExchangeCodeTtlMs = 60 * 1000;

  constructor(private prisma: PrismaService) {
    if (
      process.env.NODE_ENV === 'production' &&
      !process.env.KELEDON_AUTH_SECRET
    ) {
      throw new Error('KELEDON_AUTH_SECRET is required in production');
    }
    this.authSecret =
      process.env.KELEDON_AUTH_SECRET ||
      'keledon-dev-secret-do-not-use-in-production';
    if (!process.env.KELEDON_AUTH_SECRET) {
      console.warn(
        '[LocalAuth] WARNING: KELEDON_AUTH_SECRET not set. Using insecure default for development.',
      );
    }
  }

  async register(email: string, password: string, name?: string) {
    // Check for existing user
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Store user in Prisma DB
    const user = await this.prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: 'user',
      },
    });

    // Generate HMAC-signed token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
    };
  }

  async login(email: string, password: string) {
    // Look up user by email in Prisma DB
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !isAccountActive(user) || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate HMAC-signed token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company_id: user.companyId,
      team_id: user.teamId,
      token,
    };
  }

  async findOrCreateGoogleUser(googleUser: {
    id: string;
    email: string;
    name: string;
  }) {
    // Look up user by email in Prisma DB
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      // Create new user from Google data
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name || googleUser.email.split('@')[0],
          role: 'user',
        },
      });
    }

    if (!isAccountActive(user)) throw new UnauthorizedException('Invalid credentials');

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company_id: user.companyId,
      team_id: user.teamId,
    };
  }

  async issueGoogleExchangeCode(userId: string): Promise<string> {
    const code = crypto.randomBytes(32).toString('base64url');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = Date.now() + this.googleExchangeCodeTtlMs;

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'GOOGLE_EXCHANGE_ISSUED',
        entity: 'GOOGLE_EXCHANGE_CODE',
        entityId: codeHash,
        changes: JSON.stringify({ expiresAt }),
      },
    });

    return code;
  }

  async exchangeGoogleCode(code: string) {
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(code)) {
      throw new UnauthorizedException('Invalid or expired Google code');
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const record = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'GOOGLE_EXCHANGE_CODE',
        entityId: codeHash,
        action: 'GOOGLE_EXCHANGE_ISSUED',
      },
      select: { id: true, userId: true, changes: true },
    });
    let details: { expiresAt?: number } | null;
    try {
      details = JSON.parse(record?.changes || 'null');
    } catch {
      throw new UnauthorizedException('Invalid or expired Google code');
    }
    if (
      !record?.userId ||
      typeof details?.expiresAt !== 'number' ||
      !Number.isFinite(details.expiresAt) ||
      Date.now() >= details.expiresAt
    ) {
      throw new UnauthorizedException('Invalid or expired Google code');
    }

    const consumed = await this.prisma.auditLog.updateMany({
      where: {
        id: record.id,
        entity: 'GOOGLE_EXCHANGE_CODE',
        entityId: codeHash,
        action: 'GOOGLE_EXCHANGE_ISSUED',
      },
      data: { action: 'GOOGLE_EXCHANGE_CONSUMED', changes: null },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException('Invalid or expired Google code');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        teamId: true,
        uatFixtureRunId: true, isActive: true, authAfter: true,
        uatFixtureExpiresAt: true,
        uatFixtureRetiredAt: true,
      },
    });
    if (!isAccountActive(user)) throw new UnauthorizedException('Google account is unavailable');

    return {
      token: this.generateToken(user.id, user.email, user.role),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        teamId: user.teamId,
      },
    };
  }

  /**
   * Generate an HMAC-SHA256 signed token.
   * Format: base64(JSON.stringify({userId, email, role, expiresAt})).<HMAC signature>
   * Expires in 7 days.
   */
  generateToken(userId: string, email: string, role: string): string {
    const tokenPayload = {
      userId,
      email,
      role,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    const base64Payload = Buffer.from(JSON.stringify(tokenPayload)).toString(
      'base64',
    );
    const signature = crypto
      .createHmac('sha256', this.authSecret)
      .update(base64Payload)
      .digest('hex');

    return `${base64Payload}.${signature}`;
  }

  generateUatTestProfileToken(input: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
    actorUserId: string;
    expiresAt: number;
  }): string {
    const payload = {
      userId: input.userId,
      email: input.email,
      role: input.role,
      expiresAt: input.expiresAt,
      uatTestProfile: true,
      uatTestSessionId: input.sessionId,
      uatActorUserId: input.actorUserId,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
      .createHmac('sha256', this.authSecret)
      .update(encoded)
      .digest('hex');
    return `${encoded}.${signature}`;
  }

  generateRoleOperatorToken(userId: string, sessionId: string, expiresAt: number): string {
    const encoded = Buffer.from(JSON.stringify({ userId, roleOperator: true, roleOperatorSessionId: sessionId, expiresAt })).toString('base64');
    const signature = crypto.createHmac('sha256', this.authSecret).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
  }

  /**
   * Validate a token by checking HMAC signature and expiry.
   * Returns user data from DB if valid, null otherwise.
   */
  async validateToken(token: string, options: { allowSyntheticTts?: boolean } = {}) {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 2) return null;

      const [base64Payload, signature] = tokenParts;

      // Verify HMAC-SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', this.authSecret)
        .update(base64Payload)
        .digest('hex');

      if (
        expectedSignature.length !== signature.length ||
        !crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(signature),
        )
      ) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(base64Payload, 'base64').toString('utf-8'),
      );

      // Product role-test capabilities are accepted only by the scoped global guard.
      // Generic auth consumers, runtime, sockets and TTS must always reject them.
      if (payload?.roleOperator !== undefined || payload?.roleOperatorSessionId !== undefined) return null;

      // Check token expiry
      if (
        !payload ||
        typeof payload.userId !== 'string' ||
        !payload.userId.trim() ||
        typeof payload.expiresAt !== 'number' ||
        !Number.isFinite(payload.expiresAt) ||
        Date.now() >= payload.expiresAt
      )
        return null;

      // Look up user in Prisma DB
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!isAccountSessionCurrent(user, payload.issuedAt)) return null;

      let syntheticTtsTeamId: string | undefined;
      if (user.uatFixtureRunId?.startsWith('brain-tts-')) {
        if (!options.allowSyntheticTts || payload.syntheticTtsRunId !== user.uatFixtureRunId ||
            payload.expiresAt > user.uatFixtureExpiresAt.getTime()) return null;
        const event = await this.prisma.auditLog.findFirst({ where: {
          entity: 'BRAIN_TTS_SYNTHETIC', entityId: user.uatFixtureRunId, action: 'TTS_SYNTHETIC_CREATED',
        } });
        const run = JSON.parse(event?.changes || 'null');
        const member = run?.members?.find((entry: { id: string }) => entry.id === user.id);
        const owner = run?.actorId && await this.prisma.user.findUnique({ where: { id: run.actorId } });
        const retired = await this.prisma.auditLog.findFirst({ where: {
          entity: 'BRAIN_TTS_SYNTHETIC', entityId: user.uatFixtureRunId, action: 'TTS_SYNTHETIC_RETIRED',
        } });
        if (!event || event.userId !== run.actorId || run.runId !== user.uatFixtureRunId ||
            run.expiresAt <= Date.now() || retired || !member || member.role !== user.role ||
            member.companyId !== user.companyId || member.teamId !== user.teamId ||
            !user.email.endsWith('@example.invalid') || user.passwordHash ||
            owner?.role !== 'superadmin' || owner.uatFixtureRunId || !isAccountActive(owner) || event.createdAt.getTime() <= (owner.authAfter?.getTime() ?? 0)) return null;
        syntheticTtsTeamId = run.selectedTeamId;
      } else if (payload.syntheticTtsRunId !== undefined) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.companyId,
        team_id: user.teamId,
        syntheticTtsRunId: syntheticTtsTeamId ? user.uatFixtureRunId : undefined,
        syntheticTtsTeamId,
        last_session: user.lastLogin?.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /** Server-issued TTS-only capability, intentionally incompatible with global AuthGuard. */
  generateTtsSyntheticToken(userId: string, runId: string, expiresAt: number): string {
    const encoded = Buffer.from(JSON.stringify({
      userId, syntheticTtsRunId: runId, issuedAt: Date.now(), expiresAt,
    })).toString('base64');
    const signature = crypto.createHmac('sha256', this.authSecret).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
  }

  /** Only /me calls this after the global guard validates the audited preview session. */
  async getGuardedProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId },
      include: { company: true, team: { include: { brand: true } } },
    });
    if (!user || !isAccountActive(user)) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role,
      company_id: user.companyId, team_id: user.teamId, last_session: user.lastLogin?.toISOString(),
      company_name: user.company?.name, team_name: user.team?.name, brand_name: user.team?.brand?.name,
      created_at: user.createdAt.toISOString(),
    };
  }

  // Keep for backward compatibility — used by controller to enrich user data
  async getCrudData() {
    try {
      const fs = await import('fs');
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
