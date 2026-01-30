import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

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

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api')
  getApi() {
    return { message: 'KELEDON API is running' };
  }

  @Post('api/auth/login')
  async login(@Body() loginDto: LoginDto) {
    console.log('Login attempt:', loginDto.email);
    
    // Mock authentication for local development
    if (loginDto.email && loginDto.password) {
      const mockUser = {
        id: '1',
        email: loginDto.email,
        name: 'KELEDON User'
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        user: mockUser,
        token: mockToken
      };
      
      console.log('Login successful for:', loginDto.email);
      return response;
    } else {
      const response: AuthResponse = {
        success: false,
        message: 'Invalid credentials'
      };
      
      console.log('Login failed for:', loginDto.email);
      return response;
    }
  }

  @Post('api/auth/register')
  async register(@Body() registerDto: any) {
    console.log('Registration attempt:', registerDto.email);
    
    // Mock registration for local development
    if (registerDto.email && registerDto.password) {
      const mockUser = {
        id: '1',
        email: registerDto.email,
        name: registerDto.name || 'KELEDON User'
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      const response: AuthResponse = {
        success: true,
        message: 'Registration successful',
        user: mockUser,
        token: mockToken
      };
      
      console.log('Registration successful for:', registerDto.email);
      return response;
    } else {
      const response: AuthResponse = {
        success: false,
        message: 'Invalid registration data'
      };
      
      console.log('Registration failed for:', registerDto.email);
      return response;
    }
  }

  @Post('api/auth/verify')
  async verifyToken(@Body() body: { token: string }) {
    console.log('Token verification attempt');
    
    // Mock token verification
    if (body.token && body.token.startsWith('mock-jwt-token-')) {
      const response = {
        success: true,
        message: 'Token valid',
        user: {
          id: '1',
          email: 'user@keledon.com',
          name: 'KELEDON User'
        }
      };
      
      return response;
    } else {
      const response = {
        success: false,
        message: 'Invalid token'
      };
      
      return response;
    }
  }

  @Get('api/auth/me')
  async getCurrentUser() {
    // Mock current user endpoint
    const response = {
      success: true,
      message: 'Current user retrieved',
      user: {
        id: '1',
        email: 'user@keledon.com',
        name: 'KELEDON User'
      }
    };
    
    return response;
  }

  @Post('api/auth/logout')
  async logout(@Body() body: { token: string }) {
    console.log('Logout attempt');
    
    // Mock logout
    const response = {
      success: true,
      message: 'Logout successful'
    };
    
    return response;
  }
}