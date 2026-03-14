import { Module } from '@nestjs/common';
import { LocalAuthController } from './auth-local.controller';
import { LocalAuthService } from './auth-local.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LocalAuthController],
  providers: [LocalAuthService],
  exports: [LocalAuthService],
})
export class AuthLocalModule {}
