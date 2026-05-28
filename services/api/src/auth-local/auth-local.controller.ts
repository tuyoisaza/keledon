import { Controller, Post, Body, Get, Headers, UnauthorizedException, Res, Query, Req } from '@nestjs/common';
import { LocalAuthService } from './auth-local.service';
import { GoogleOAuthService } from './google-oauth.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../guards/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

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
    companyId?: string;
    teamId?: string;
    companyName?: string | null;
    brandName?: string | null;
    teamName?: string | null;
    createdAt?: string | null;
    lastSession?: string | null;
  };
  token?: string;
}

@ApiTags('Auth')
@Controller('api/auth')
export class LocalAuthController {
  constructor(
    private readonly authService: LocalAuthService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly configService: ConfigService
  ) {}

  @Public()
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

  @Public()
  @Get('google')
  googleLogin(@Res() res: any) {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    
    if (!clientId) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    const authUrl = this.googleOAuthService.getAuthUrl();
    return res.redirect(authUrl);
  }

  @Public()
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
      
      const token = this.authService.generateToken(user.id, user.email, user.role);

      return res.redirect(`/login?token=${token}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return res.status(500).json({ message: 'Google login failed', error: error.message });
    }
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    try {
      const result = await this.authService.register(dto.email, dto.password, dto.name);
      return {
        success: true,
        message: 'Registration successful',
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          role: result.role,
        },
        token: result.token,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    try {
      const result = await this.authService.login(dto.email, dto.password);
      
      const crudData = await this.authService.getCrudData();
      const companies = crudData.companies || [];
      const brands = crudData.brands || [];
      const teams = crudData.teams || [];
      
      const company = companies.find(c => c.id === result.company_id);
      const team = teams.find(t => t.id === result.team_id);
      const brand = team?.brand_id ? brands.find(b => b.id === team.brand_id) : null;
      
      const fullUser = {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        companyId: result.company_id,
        teamId: result.team_id,
        companyName: company?.name || null,
        brandName: brand?.name || null,
        teamName: team?.name || null,
        createdAt: company?.created_at || null,
      };
      
      return {
        success: true,
        message: 'Login successful',
        user: fullUser,
        token: result.token,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getCurrentUser(@Req() req: any, @Headers('authorization') authHeader: string): Promise<AuthResponse> {
    try {
      // Token is already validated by global AuthGuard, but also validate explicitly
      // for backward compatibility
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
        companyId: user.company_id,
        teamId: user.team_id,
        companyName: company?.name || null,
        brandName: brand?.name || null,
        teamName: team?.name || null,
        createdAt: company?.created_at || null,
        lastSession: user.last_session || null,
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
