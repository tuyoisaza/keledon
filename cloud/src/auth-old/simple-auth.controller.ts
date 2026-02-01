import { Controller, Post, Body, Get } from '@nestjs/common';
import { MinimalSupabaseService } from '../supabase/minimal-supabase.service';

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
export class AuthController {
  constructor(private readonly supabaseService: MinimalSupabaseService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    try {
      console.log('REAL Supabase login attempt:', loginDto.email);
      
      const result = await this.supabaseService.signIn(loginDto.email, loginDto.password);
      
      return {
        success: true,
        message: 'Login successful',
        user: {
          id: result.user?.id || 'unknown',
          email: result.user?.email || loginDto.email,
          name: result.user?.user_metadata?.name || result.user?.email || loginDto.email
        },
        token: result.session?.access_token || 'no-token'
      };
    } catch (error) {
      console.error('REAL Supabase login failed:', error);
      return {
        success: false,
        message: `Login failed: ${error.message}`
      };
    }
  }

  @Post('register')
  async register(@Body() registerDto: { email: string; password: string; name?: string }): Promise<AuthResponse> {
    try {
      console.log('REAL Supabase registration attempt:', registerDto.email);
      
      const result = await this.supabaseService.signUp(
        registerDto.email, 
        registerDto.password, 
        registerDto.name
      );
      
      return {
        success: true,
        message: 'Registration successful',
        user: {
          id: result.user?.id || 'unknown',
          email: result.user?.email || registerDto.email,
          name: result.user?.user_metadata?.name || registerDto.name || result.user?.email || registerDto.email
        },
        token: result.session?.access_token || 'no-token'
      };
    } catch (error) {
      console.error('REAL Supabase registration failed:', error);
      return {
        success: false,
        message: `Registration failed: ${error.message}`
      };
    }
  }

  @Get('me')
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      console.log('REAL get current user attempt');
      
      const user = await this.supabaseService.getCurrentUser();
      
      if (user) {
        return {
          success: true,
          message: 'Current user retrieved',
          user: {
            id: user.id || 'unknown',
            email: user.email || 'unknown',
            name: user.user_metadata?.name || user.email || 'unknown'
          }
        };
      } else {
        return {
          success: true,
          message: 'No user logged in',
          user: null
        };
      }
    } catch (error) {
      console.error('REAL get current user failed:', error);
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
      console.log('REAL logout attempt');
      
      await this.supabaseService.signOut();
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('REAL logout failed:', error);
      return {
        success: false,
        message: `Logout failed: ${error.message}`
      };
    }
  }
}