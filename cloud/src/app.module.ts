import { Module } from '@nestjs/common';
import { RBACModule } from './rbac/rbac.module';

@Module({
  imports: [
    RBACModule,
  ],
})
export class AppModule {}