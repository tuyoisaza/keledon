import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';
import { IS_PUBLIC_KEY } from './public.decorator';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  expiresAt: number;
}

interface AuthenticatedRequest {
  user?: TokenPayload;
  headers: { authorization?: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly authSecret: string;

  constructor(private reflector: Reflector) {
    this.authSecret =
      process.env.KELEDON_AUTH_SECRET ||
      'keledon-dev-secret-do-not-use-in-production';
    if (!process.env.KELEDON_AUTH_SECRET) {
      console.warn(
        '[AuthGuard] WARNING: KELEDON_AUTH_SECRET not set. Using insecure default for development.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
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
    const user = this.validateToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = user;
    return true;
  }

  private validateToken(token: string): TokenPayload | null {
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
      if (Date.now() > payload.expiresAt) {
        return null;
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
}
