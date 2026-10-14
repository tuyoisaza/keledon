import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  isPermittedUatTestProfile,
  parseUatTestProfileIds,
  UAT_TEST_PROFILE_AUDIT_ENTITY,
  UAT_TEST_PROFILE_TTL_MS,
  uatTestProfilesEnabled,
} from '../auth-local/uat-test-profile.policy';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  expiresAt: number;
  uatTestProfile?: true;
  uatTestSessionId?: string;
  uatActorUserId?: string;
}

interface AuthenticatedRequest {
  user?: TokenPayload;
  headers: { authorization?: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly authSecret: string;

  constructor(
    private reflector: Reflector,
    private readonly prisma?: PrismaService,
  ) {
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
        '[AuthGuard] WARNING: KELEDON_AUTH_SECRET not set. Using insecure default for development.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow routes marked with @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const token = parts[1];
    const user = await this.validateToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = user;
    return true;
  }

  private async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 2) {
        return null;
      }

      const [base64Payload, signature] = tokenParts;

      // Verify HMAC-SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', this.authSecret)
        .update(base64Payload)
        .digest('hex');

      // Timing-safe comparison to prevent timing attacks
      if (
        expectedSignature.length !== signature.length ||
        !crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(signature),
        )
      ) {
        return null;
      }

      // Decode and parse payload
      const payload: TokenPayload = JSON.parse(
        Buffer.from(base64Payload, 'base64').toString('utf-8'),
      );

      // Check token expiry
      if (
        !payload ||
        typeof payload.userId !== 'string' ||
        !payload.userId.trim() ||
        typeof payload.email !== 'string' ||
        typeof payload.role !== 'string' ||
        typeof payload.expiresAt !== 'number' ||
        !Number.isFinite(payload.expiresAt) ||
        Date.now() >= payload.expiresAt
      ) {
        return null;
      }

      if (
        payload.uatTestProfile !== undefined &&
        payload.uatTestProfile !== true
      ) {
        return null;
      }
      if (
        payload.uatTestProfile !== true &&
        (payload.uatTestSessionId !== undefined ||
          payload.uatActorUserId !== undefined)
      ) {
        return null;
      }
      if (payload.uatTestProfile === true) {
        return this.validateUatTestProfileToken(payload);
      }

      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        expiresAt: payload.expiresAt,
      };
    } catch {
      return null;
    }
  }

  private async validateUatTestProfileToken(
    payload: TokenPayload,
  ): Promise<TokenPayload | null> {
    if (
      !this.prisma ||
      !uatTestProfilesEnabled() ||
      !payload.uatTestSessionId ||
      !payload.uatActorUserId ||
      payload.expiresAt - Date.now() > UAT_TEST_PROFILE_TTL_MS
    ) {
      return null;
    }

    try {
      const [session, ended, profile, actor] = await Promise.all([
        this.prisma.auditLog.findFirst({
          where: {
            entity: UAT_TEST_PROFILE_AUDIT_ENTITY,
            entityId: payload.uatTestSessionId,
            action: 'UAT_TEST_PROFILE_START',
          },
          select: { userId: true, changes: true, createdAt: true },
        }),
        this.prisma.auditLog.findFirst({
          where: {
            entity: UAT_TEST_PROFILE_AUDIT_ENTITY,
            entityId: payload.uatTestSessionId,
            action: 'UAT_TEST_PROFILE_END',
          },
          select: { id: true },
        }),
        this.prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, name: true, email: true, role: true },
        }),
        this.prisma.user.findUnique({
          where: { id: payload.uatActorUserId },
          select: { id: true, role: true },
        }),
      ]);
      const details = JSON.parse(session?.changes || 'null');
      const allowedIds = parseUatTestProfileIds(
        process.env.KELEDON_UAT_TEST_PROFILE_IDS,
      );
      if (
        !session ||
        ended ||
        !details ||
        session.userId !== payload.uatActorUserId ||
        details.actorUserId !== payload.uatActorUserId ||
        details.profileUserId !== payload.userId ||
        details.profileRole !== profile?.role ||
        details.expiresAt !== payload.expiresAt ||
        Date.now() >= details.expiresAt ||
        details.expiresAt - session.createdAt.getTime() >
          UAT_TEST_PROFILE_TTL_MS ||
        !allowedIds.includes(payload.userId) ||
        !profile ||
        !isPermittedUatTestProfile(profile) ||
        actor?.role !== 'superadmin'
      ) {
        return null;
      }

      return {
        userId: profile.id,
        email: profile.email,
        role: profile.role,
        expiresAt: payload.expiresAt,
        uatTestProfile: true,
        uatTestSessionId: payload.uatTestSessionId,
        uatActorUserId: payload.uatActorUserId,
      };
    } catch {
      return null;
    }
  }
}
