import { Controller, Post, Body } from '@nestjs/common';
import { Phase1AuthService } from './phase1-auth.service';

interface LoginDto {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  token?: string;
}

@Controller('api/auth')
export class Phase1AuthController {
  constructor(private readonly authService: Phase1AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    try {
      console.log('[PHASE1 AUTH] REAL login attempt:', loginDto.email);
      
      const result = await this.authService.signIn(loginDto.email, loginDto.password);
      
      return {
        success: true,
        message: 'Phase 1 Login successful',
        user: result.user,
        token: result.session?.access_token
      };
    } catch (error) {
      console.error('[PHASE1 AUTH] REAL login failed:', error);
      return {
        success: false,
        message: `Login failed: ${error.message}`
      };
    }
  }

  @Get('me')
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      console.log('[PHASE1 AUTH] REAL get current user attempt');
      
      const user = await this.authService.getCurrentUser();
      
      if (user) {
        return {
          success: true,
          message: 'Current user retrieved',
          user: user
        };
      } else {
        return {
          success: true,
          message: 'No user logged in',
          user: null
        };
      }
    } catch (error) {
      console.error('[PHASE1 AUTH] REAL get current user failed:', error);
      return {
        success: false,
        message: `Failed to get current user: ${error.message}`,
        user: null
      };
    }
  }

  @Post('logout')
  async logout(): Promise<AuthResponse> {
    try {
      console.log('[PHASE1 AUTH] REAL logout attempt');
      
      await this.authService.signOut();
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('[PHASE1 AUTH] REAL logout failed:', error);
      return {
        success: false,
        message: `Logout failed: ${error.message}`
      };
    }
  }
}