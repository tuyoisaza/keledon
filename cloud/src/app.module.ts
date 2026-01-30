import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AuthGuard],
  exports: [AuthGuard],
})
export class AppModule {}