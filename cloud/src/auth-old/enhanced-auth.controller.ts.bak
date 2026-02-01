import { Controller, Post, Body, Get, Put, Delete } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '../config/config.service';

interface RegisterDto {
  email: string;
  password: string;
  name?: string;
  preferences?: any;
}

interface LoginDto {
  email: string;
  password: string;
}

interface VerifyTokenDto {
  token: string;
}

interface UserProfileUpdateDto {
  name?: string;
  preferences?: any;
}

interface UserPreference {
  key: string;
  value: any;
}

@Controller('api/auth')
export class EnhancedAuthController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
      console.log('[Enhanced Auth] Registration request:', { email: body.email, hasName: !!body.name });
      
      const user = await this.supabaseService.signUp(body.email, body.password, body.name);
      
      // Create user preferences
      if (body.preferences) {
        await this.supabaseService.createUserPreferences(user.id, body.preferences);
      }
      
      console.log('[Enhanced Auth] User registered successfully:', user);
      return {
        success: true,
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        session: {
          access_token: user.session?.access_token,
          refresh_token: user.session?.refresh_token,
          user_id: user.id,
          expires_at: user.session?.expires_at
        }
      };
    } catch (error) {
      console.error('[Enhanced Auth] Registration error:', error);
      return {
        success: false,
        error: error.message,
        message: `Registration failed: ${error.message}`
      };
    }
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    try {
      console.log('[Enhanced Auth] Login request:', { email: body.email });
      
      const result = await this.supabaseService.signIn(body.email, body.password);
      
      // Create or update user session
      if (result.user) {
        const sessionData = {
          user_id: result.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        
        const { data: session } = await this.supabaseService.createSession(sessionData);
        await this.supabaseService.upsertSession(session.id, { ...result.session, ...sessionData });
      }
      
      console.log('[Enhanced Auth] User logged in successfully:', result);
      return {
        success: true,
        message: 'Login successful',
        user: result.user,
        session: {
          access_token: session.data.access_token,
          refresh_token: session.data.refresh_token,
          user_id: session.data.user_id,
          expires_at: session.data.expires_at
        }
      };
    } catch (error) {
      console.error('[Enhanced Auth] Login error:', error);
      return {
        success: false,
        error: error.message,
        message: `Login failed: ${error.message}`
      };
    }
  }

  @Get('me')
  async getCurrentUser(@Param() session?: string) {
    try {
      console.log('[Enhanced Auth] Get current user request');
      
      let user = null;
      let session = null;
      
      // If session provided, get user from session
      if (session) {
        session = await this.supabaseService.getSession(session);
        if (session?.data?.user_id) {
          user = await this.supabaseService.getUser(session.data.user_id);
        }
      } else {
        // Try to get user from current auth context
        user = await this.supabaseService.getCurrentUser();
      }
      
      return {
        success: true,
        message: 'User retrieved successfully',
        user: user,
        session: session
      };
    } catch (error) {
      console.error('[Enhanced Auth] Get current user error:', error);
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
      console.log('[Enhanced Auth] Logout request');
      
      if (body.token) {
        await this.supabaseService.signOut(body.token);
        
        // Invalidate session
        const { data: session } = await this.supabaseService.getSession(body.token);
        if (session) {
          await this.supabaseService.updateSession(session.id, { 
            expires_at: new Date().toISOString() 
          });
        }
      } else {
        await this.supabaseService.signOut();
      }
      
      console.log('[Enhanced Auth] User logged out successfully');
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('[Enhanced Auth] Logout error:', error);
      return {
        success: false,
        error: error.message,
        message: `Logout failed: ${error.message}`
      };
    }
  }

  @Post('verify')
  async verifyToken(@Body() body: VerifyTokenDto) {
    try {
      console.log('[Enhanced Auth] Verify token request:', { token: body.token.substring(0, 20) + '...' });
      
      const user = await this.supabaseService.getUser(body.token);
      
      return {
        success: true,
        message: 'Token verified successfully',
        user: user,
        valid: !!user
      };
    } catch (error) {
      console.error('[Enhanced Auth] Token verification error:', error);
      return {
        success: false,
        error: error.message,
        message: `Verification failed: ${error.message}`
      };
    }
  }

  @Post('password/reset')
  async resetPassword(@Body() body: { email: string }) {
    try {
      console.log('[Enhanced Auth] Password reset request:', { email: body.email });
      
      const { data, error } = await this.supabaseService.resetPasswordForEmail(body.email);
      
      return {
        success: true,
        message: 'Password reset email sent',
        data: data
      };
    } catch (error) {
      console.error('[Enhanced Auth] Password reset error:', error);
      return {
        success: false,
        error: error.message,
        message: `Password reset failed: ${error.message}`
      };
    }
  }

  @Put('preferences')
  async updatePreferences(@Param() userId: string, @Body() body: { preferences: Record<string, any> }) {
    try {
      console.log('[Enhanced Auth] Update preferences request:', { userId, preferences });
      
      // Update each preference
      for (const [key, value] of Object.entries(body.preferences)) {
        await this.supabaseService.updateUserPreference(userId, key, value);
      }
      
      return {
        success: true,
        message: 'Preferences updated successfully'
      };
    } catch (error) {
      console.error('[Enhanced Auth] Update preferences error:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update preferences: ${error.message}`
      };
    }
  }

  @Get('preferences')
  async getPreferences(@Param() userId: string) {
    try {
      console.log('[Enhanced Auth] Get preferences request:', { userId });
      
      const { data } = await this.supabaseService.getUserPreferences(userId);
      
      return {
        success: true,
        preferences: data || {}
      };
    } catch (error) {
      console.error('[Enhanced Auth] Get preferences error:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get preferences: ${error.message}`
      };
    }
  }

  @Post('refresh-token')
  async refreshToken(@Body() body: { refresh_token: string }) {
    try {
      console.log('[Enhanced Auth] Token refresh request:', { refresh_token: body.refresh_token.substring(0, 20) + '...' });
      
      const { data: session } = await this.supabaseService.refreshSession(body.refresh_token);
      
      return {
        success: true,
        message: 'Token refreshed successfully',
        access_token: session.data?.access_token,
        refresh_token: session.data?.refresh_token,
        user: session.data?.user_id,
        expires_at: session.data?.expires_at
      };
    } catch (error) {
      console.error('[Enhanced Auth] Token refresh error:', error);
      return {
        success: false,
        error: error.message,
        message: `Token refresh failed: ${error.message}`
      };
    }
  }
}