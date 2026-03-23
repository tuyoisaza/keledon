import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEBUG_MODE_DURATION_HOURS = 4;

@Injectable()
export class DebugModeService {
  private readonly logger = new Logger(DebugModeService.name);

  constructor(private prisma: PrismaService) {}

  async isDebugMode(): Promise<boolean> {
    const debugMode = await this.prisma.debugMode.findFirst({
      where: { isActive: true },
    });

    if (!debugMode) {
      return false;
    }

    if (debugMode.expiresAt && new Date() > debugMode.expiresAt) {
      await this.prisma.debugMode.update({
        where: { id: debugMode.id },
        data: { isActive: false },
      });
      this.logger.log('[DebugMode] Auto-expired');
      return false;
    }

    return true;
  }

  async activate(activatedBy: string): Promise<{ success: boolean; expiresAt: Date }> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + DEBUG_MODE_DURATION_HOURS);

    await this.prisma.debugMode.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    await this.prisma.debugMode.create({
      data: {
        isActive: true,
        activatedBy,
        activatedAt: new Date(),
        expiresAt,
        autoExpire: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: activatedBy,
        action: 'DEBUG_MODE_ACTIVATED',
        entity: 'debug_mode',
        changes: JSON.stringify({ expiresAt: expiresAt.toISOString() }),
      },
    });

    this.logger.log(`[DebugMode] Activated by user ${activatedBy}, expires at ${expiresAt.toISOString()}`);

    return { success: true, expiresAt };
  }

  async deactivate(activatedBy: string): Promise<{ success: boolean }> {
    const debugMode = await this.prisma.debugMode.findFirst({
      where: { isActive: true },
    });

    if (debugMode) {
      await this.prisma.debugMode.update({
        where: { id: debugMode.id },
        data: { isActive: false },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: activatedBy,
          action: 'DEBUG_MODE_DEACTIVATED',
          entity: 'debug_mode',
          changes: JSON.stringify({ previousExpiry: debugMode.expiresAt?.toISOString() }),
        },
      });

      this.logger.log(`[DebugMode] Deactivated by user ${activatedBy}`);
    }

    return { success: true };
  }

  async getStatus(): Promise<{ isActive: boolean; expiresAt: Date | null; activatedBy: string | null }> {
    const debugMode = await this.prisma.debugMode.findFirst({
      where: { isActive: true },
    });

    if (!debugMode) {
      return { isActive: false, expiresAt: null, activatedBy: null };
    }

    if (debugMode.expiresAt && new Date() > debugMode.expiresAt) {
      await this.prisma.debugMode.update({
        where: { id: debugMode.id },
        data: { isActive: false },
      });
      return { isActive: false, expiresAt: null, activatedBy: null };
    }

    return {
      isActive: debugMode.isActive,
      expiresAt: debugMode.expiresAt,
      activatedBy: debugMode.activatedBy,
    };
  }
}
