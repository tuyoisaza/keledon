import { Module } from '@nestjs/common';

@Module({
  controllers: [
    require('./enhanced-auth.controller'),
  ],
  providers: [
    require('./auth/auth.service'),
    require('./supabase/supabase.service'),
  ],
  exports: [
    require('./auth/auth.service'),
    require('./supabase/supabase.service'),
    require('./config/config.service'),
  ],
})
export class AuthModule {}