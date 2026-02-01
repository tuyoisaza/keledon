import { Controller, Post, Body } from '@nestjs/common';
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
      console.log('REAL MINIMAL Supabase login attempt:', loginDto.email);
      
      const result = await this.supabaseService.signIn(loginDto.email, loginDto.password);
      
      return {
        success: true,
        message: 'Login successful',
        user: result.user,
        token: result.session?.access_token
      };
    } catch (error) {
      console.error('REAL MINIMAL Supabase login failed:', error);
      return {
        success: false,
        message: `Login failed: ${error.message}`
      };
    }
  }

  @Get('me')
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      console.log('REAL MINIMAL get current user attempt');
      
      const user = await this.supabaseService.getCurrentUser();
      
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
      console.error('REAL MINIMAL get current user failed:', error);
      return {
        success: false,
        message: `Failed to get current user: ${error.message}`,
        user: null
      };
    }
  }
}