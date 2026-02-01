import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { Phase1AuthModule } from './auth-clean/phase1-auth.module';
import { DashboardGateway } from './gateways/dashboard.gateway';
import { AgentMonitoringService } from './services/agent-monitoring.service';
import { AILoopService } from './services/ai-loop.service';

@Module({
  imports: [
    ConfigModule,
    Phase1AuthModule,
    // We'll add WebSocket and RPA modules next
  ],
  providers: [
    DashboardGateway,
    AgentMonitoringService,
    AILoopService
  ],
})
export class AppModule {}