import { Module } from '@nestjs/common';
import { RBACModule } from './rbac/rbac.module';
import { SessionModule } from './modules/session.module';

@Module({
  imports: [
    RBACModule,
    SessionModule,
  ],
})
export class AppModule {}