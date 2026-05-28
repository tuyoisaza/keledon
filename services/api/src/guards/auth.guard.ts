import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface AuthenticatedRequest {
  user?: any;
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    console.log('AuthGuard: Checking authentication...');
    
    // For local development, allow all requests
    // In production, this would validate JWT tokens
    
    console.log('AuthGuard: Request allowed (local development mode)');
    return true;
  }
}