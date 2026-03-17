import { Controller, Post, Body, Get, Headers, UnauthorizedException, Res, Query, Req } from '@nestjs/common';
import { LocalAuthService } from './auth-local.service';
import { GoogleOAuthService } from './google-oauth.service';
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
    company_id?: string;
  };
  token?: string;
}

@Controller('api/auth')
export class LocalAuthController {
  constructor(
    private readonly authService: LocalAuthService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly configService: ConfigService
  ) {}

  @Get('debug')
  debug(@Res() res: any) {
    return res.json({
      googleClientId: this.configService.get('GOOGLE_CLIENT_ID') ? 'set' : 'not set',
      googleClientSecret: this.configService.get('GOOGLE_CLIENT_SECRET') ? 'set' : 'not set',
      googleRedirectUri: this.configService.get('GOOGLE_REDIRECT_URI'),
      nodeEnv: this.configService.get('NODE_ENV'),
      allEnv: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('PASSWORD')).sort(),
    });
  }

  @Get('google')
  googleLogin(@Res() res: any) {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    
    if (!clientId) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    const authUrl = this.googleOAuthService.getAuthUrl();
    return res.redirect(authUrl);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: any) {
    if (!code) {
      return res.status(400).json({ message: 'No authorization code provided' });
    }

    try {
      const googleUser = await this.googleOAuthService.verifyCode(code);
      
      console.log('Google user verified:', googleUser.email);

      const user = await this.authService.findOrCreateGoogleUser({
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
      });
      
      const token = this.authService.generateToken(user.id);

      return res.redirect(`/login?token=${token}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return res.status(500).json({ message: 'Google login failed', error: error.message });
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

      const crudData = await this.authService.getCrudData();
      const companies = crudData.companies || [];
      const brands = crudData.brands || [];
      const teams = crudData.teams || [];

      const company = companies.find(c => c.id === user.company_id);
      const team = teams.find(t => t.id === user.team_id);
      const brand = team?.brand_id ? brands.find(b => b.id === team.brand_id) : null;

      const fullUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        team_id: user.team_id,
        company_name: company?.name || null,
        brand_name: brand?.name || null,
        team_name: team?.name || null,
        created_at: company?.created_at || null,
        last_session: user.last_session || null,
      };

      return {
        success: true,
        user: fullUser,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
