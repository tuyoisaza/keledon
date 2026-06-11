import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const secret = this.configService.get<string>('WEBHOOK_SECRET');

    if (!secret) {
      console.warn('[WebhookGuard] WEBHOOK_SECRET not configured — denying all webhook requests');
      throw new UnauthorizedException('Webhook secret not configured on server');
    }

    if (token !== secret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }
}
