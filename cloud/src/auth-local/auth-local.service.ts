import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LocalAuthService {
  constructor(private prisma: PrismaService) {}

  async register(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: 'admin',
      },
    });

    return { id: user.id, email: user.email, name: user.name };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new Error('User has no password set');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    return { id: user.id, email: user.email, name: user.name, role: user.role };
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
      const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
      return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
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
}
