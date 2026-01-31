import { Controller, Post, Body, Get, Param, Put, Delete } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; name?: string }) {
    try {
      console.log('[Auth Controller] Registration request:', { email: body.email, hasName: !!body.name });
      
      const user = await this.supabaseService.signUp(body.email, body.password, body.name);
      
      return {
        success: true,
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          created_at: user.created_at
        }
      };
    } catch (error) {
      console.error('[Auth Controller] Registration error:', error);
      return {
        success: false,
        error: error.message,
        message: `Registration failed: ${error.message}`
      };
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      console.log('[Auth Controller] Login request:', { email: body.email });
      
      const result = await this.supabaseService.signIn(body.email, body.password);
      
      return {
        success: true,
        message: 'Login successful',
        user: result.user,
        session: result.session,
        access_token: result.access_token,
        refresh_token: result.refresh_token
      };
    } catch (error) {
      console.error('[Auth Controller] Login error:', error);
      return {
        success: false,
        error: error.message,
        message: `Login failed: ${error.message}`
      };
    }
  }

  @Post('verify')
  async verify(@Body() body: { token: string }) {
    try {
      console.log('[Auth Controller] Verify request');
      
      const result = await this.supabaseService.verifyToken(body.token);
      
      return {
        success: true,
        message: 'Token verified successfully',
        user: result.user,
        valid: result.valid
      };
    } catch (error) {
      console.error('[Auth Controller] Verification error:', error);
      return {
        success: false,
        error: error.message,
        message: `Verification failed: ${error.message}`
      };
    }
  }

  @Get('me')
  async getCurrentUser(@Param() session?: string) {
    try {
      console.log('[Auth Controller] Get current user request:', { session });
      
      const user = await this.supabaseService.getCurrentUser();
      
      return {
        success: true,
        message: 'Current user retrieved successfully',
        user: user
      };
    } catch (error) {
      console.error('[Auth Controller] Get current user error:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get current user: ${error.message}`
      };
    }
  }

  @Post('logout')
  async logout(@Body() body: { token?: string }) {
    try {
      console.log('[Auth Controller] Logout request');
      
      if (body.token) {
        await this.supabaseService.signOut(body.token);
      } else {
        await this.supabaseService.signOut();
      }
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('[Auth Controller] Logout error:', error);
      return {
        success: false,
        error: error.message,
        message: `Logout failed: ${error.message}`
      };
    }
  }

  @Put('password/reset')
  async resetPassword(@Body() body: { email: string }) {
    try {
      console.log('[Auth Controller] Password reset request:', { email: body.email });
      
      const result = await this.supabaseService.resetPassword(body.email);
      
      return {
        success: true,
        message: 'Password reset email sent successfully',
        result
      };
    } catch (error) {
      console.error('[Auth Controller] Password reset error:', error);
      return {
        success: false,
        error: error.message,
        message: `Password reset failed: ${error.message}`
      };
    }
  }

  @Post('refresh-token')
  async refreshToken(@Body() body: { refresh_token: string }) {
    try {
      console.log('[Auth Controller] Token refresh request');
      
      const result = await this.supabaseService.refreshToken(body.refresh_token);
      
      return {
        success: true,
        message: 'Token refreshed successfully',
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        user: result.user
      };
    } catch (error) {
      console.error('[Auth Controller] Token refresh error:', error);
      return {
        success: false,
        error: error.message,
        message: `Token refresh failed: ${error.message}`
      };
    }
  }
}