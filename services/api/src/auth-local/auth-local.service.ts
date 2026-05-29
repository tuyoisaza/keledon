import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocalAuthService {
  private readonly authSecret: string;

  constructor(private prisma: PrismaService) {
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
        role: 'admin',
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
          role: 'superadmin',
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

      const payload = JSON.parse(
        Buffer.from(base64Payload, 'base64').toString('utf-8'),
      );

      // Check token expiry
      if (Date.now() > payload.expiresAt) return null;

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
