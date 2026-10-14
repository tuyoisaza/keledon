import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface CrudDirectoryItem {
  id: string;
  name?: string;
  brand_id?: string;
  created_at?: string;
}

interface CrudDirectoryData {
  companies: CrudDirectoryItem[];
  brands: CrudDirectoryItem[];
  teams: CrudDirectoryItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function directoryItems(value: unknown): CrudDirectoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string') return [];
    return [
      {
        id: entry.id,
        ...(typeof entry.name === 'string' ? { name: entry.name } : {}),
        ...(typeof entry.brand_id === 'string'
          ? { brand_id: entry.brand_id }
          : {}),
        ...(typeof entry.created_at === 'string'
          ? { created_at: entry.created_at }
          : {}),
      },
    ];
  });
}

@Injectable()
export class LocalAuthService {
  private readonly authSecret: string;

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
    if (!user || !user.passwordHash) {
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

  /**
   * Validate a token by checking HMAC signature and expiry.
   * Returns user data from DB if valid, null otherwise.
   */
  async validateToken(token: string) {
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

      const parsedPayload: unknown = JSON.parse(
        Buffer.from(base64Payload, 'base64').toString('utf-8'),
      );
      if (!isRecord(parsedPayload)) return null;
      const payload = parsedPayload;

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
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.companyId,
        team_id: user.teamId,
        last_session: user.lastLogin?.toISOString(),
      };
    } catch {
      return null;
    }
  }

  // Keep for backward compatibility — used by controller to enrich user data
  async getCrudData(): Promise<CrudDirectoryData> {
    try {
      const fs = await import('fs');
      const dataFile = '/app/data/crud.json';
      if (fs.existsSync(dataFile)) {
        const value: unknown = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
        if (isRecord(value)) {
          return {
            companies: directoryItems(value.companies),
            brands: directoryItems(value.brands),
            teams: directoryItems(value.teams),
          };
        }
      }
    } catch {
      console.error('Failed to load CRUD directory metadata');
    }
    return { companies: [], brands: [], teams: [] };
  }
}
