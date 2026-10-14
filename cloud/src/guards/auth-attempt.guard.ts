import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';

// Bounded in-process abuse brake. No scheduler, persistence or external service.
@Injectable()
export class AuthAttemptGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { start: number; count: number }
  >();
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string;
      socket?: { remoteAddress?: string | null };
    }>();
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = context.getHandler().name + ':' + ip;
    for (const [entry, value] of this.attempts)
      if (now - value.start >= 60000) this.attempts.delete(entry);
    let bucket = this.attempts.get(key);
    if (!bucket) {
      if (this.attempts.size >= 2048) {
        const oldestKey = Array.from(this.attempts.keys())[0];
        if (oldestKey) this.attempts.delete(oldestKey);
      }
      bucket = { start: now, count: 0 };
      this.attempts.set(key, bucket);
    }
    bucket.count++;
    if (bucket.count > 20)
      throw new HttpException('Too many authentication attempts', 429);
    return true;
  }
}
