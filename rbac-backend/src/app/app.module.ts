import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RBACModule } from '../rbac/rbac.module';

@Module({
  imports: [
    RBACModule,
  ],
  controllers: [
    AppController,
  ],
  providers: [],
})
export class AppModule {}