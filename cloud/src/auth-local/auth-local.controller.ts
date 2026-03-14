import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { LocalAuthService } from './auth-local.service';

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
  constructor(private readonly authService: LocalAuthService) {}

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
