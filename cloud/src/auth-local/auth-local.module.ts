import { Module } from '@nestjs/common';
import { LocalAuthController } from './auth-local.controller';
import { LocalAuthService } from './auth-local.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LocalAuthController],
  providers: [LocalAuthService, GoogleOAuthService],
  exports: [LocalAuthService, GoogleOAuthService],
})
export class AuthLocalModule {}
