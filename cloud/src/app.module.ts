import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { Phase1AuthModule } from './auth-clean/phase1-auth.module';

@Module({
  imports: [
    ConfigModule,
    Phase1AuthModule,
    // We'll add WebSocket and RPA modules next
  ],
})
export class AppModule {}