import { Module } from '@nestjs/common';
import { Phase1AuthController } from './phase1-auth.controller';
import { Phase1AuthService } from './phase1-auth.service';

@Module({
  controllers: [Phase1AuthController],
  providers: [Phase1AuthService],
  exports: [Phase1AuthService],
})
export class Phase1AuthModule {}