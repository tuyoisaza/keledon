import { Module } from '@nestjs/common';
import { BrowserCommandsController } from './browser-commands.controller';
import { BrowserCommandsService } from './browser-commands.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InterfaceControlService } from '../interface-control/interface-control.service';

@Module({
  imports: [PrismaModule],
  controllers: [BrowserCommandsController],
  providers: [BrowserCommandsService, InterfaceControlService],
  exports: [BrowserCommandsService, InterfaceControlService],
})
export class BrowserCommandsModule {}
