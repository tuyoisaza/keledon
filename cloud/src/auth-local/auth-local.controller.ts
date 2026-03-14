import { Controller, Post, Body, Get, Headers, UnauthorizedException, Res, Query, Req } from '@nestjs/common';
import { LocalAuthService } from './auth-local.service';
import { ConfigService } from '@nestjs/config';

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
  token?: string;
}

@Controller('api/auth')
export class LocalAuthController {
  constructor(
    private readonly authService: LocalAuthService,
    private readonly configService: ConfigService
  ) {}

  @Get('google')
  googleLogin(@Res() res: any) {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI') || 'https://keledon.tuyoisaza.com/api/auth/google/callback';
    
    if (!clientId) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    const scope = 'openid email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
    return res.redirect(authUrl);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: any) {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI') || 'https://keledon.tuyoisaza.com/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenRes.json();

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const googleUser = await userRes.json();

      let user = await this.authService.findOrCreateGoogleUser(googleUser);
      const token = this.authService.generateToken(user.id);

      return res.redirect(`/login?token=${token}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return res.status(500).json({ message: 'Google login failed' });
    }
  }

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    try {
      const user = await this.authService.register(dto.email, dto.password, dto.name);
      const token = this.authService.generateToken(user.id);
      return {
        success: true,
        message: 'Registration successful',
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    try {
      const user = await this.authService.login(dto.email, dto.password);
      const token = this.authService.generateToken(user.id);
      return {
        success: true,
        message: 'Login successful',
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('me')
  async getCurrentUser(@Headers('authorization') authHeader: string): Promise<AuthResponse> {
    try {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No token provided');
      }
      const token = authHeader.substring(7);
      const user = await this.authService.validateToken(token);
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
