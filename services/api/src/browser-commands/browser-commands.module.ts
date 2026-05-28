import { Module } from '@nestjs/common';
import { BrowserCommandsController } from './browser-commands.controller';
import { BrowserCommandsService } from './browser-commands.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BrowserCommandsController],
  providers: [BrowserCommandsService],
  exports: [BrowserCommandsService],
})
export class BrowserCommandsModule {}
