import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { Public } from '../guards/public.decorator';
import { AuthAttemptGuard } from '../guards/auth-attempt.guard';
import { DeviceAccessGuard } from '../guards/device-access.guard';
import type { User } from '@prisma/client';

interface DeviceControllerRequest {
  deviceBinding: { userId: string; companyId: string; keledonId?: string };
  actor: Pick<User, 'id' | 'role' | 'companyId'>;
}

@Controller('api/devices')
@UseGuards(DeviceAccessGuard)
export class DeviceController {
  constructor(private deviceService: DeviceService) {}

  @Post('pair')
  @Public()
  @UseGuards(AuthAttemptGuard)
  async pairDevice(
    @Body()
    body: {
      device_id: string;
      machine_id: string;
      pairing_code: string;
      platform: string;
      name: string;
      keledon_id?: string;
    },
  ) {
    try {
      const result = await this.deviceService.pairDevice({
        ...body,
      });
      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  @Post('register')
  async registerDevice(
    @Body()
    body: {
      device_id: string;
      machine_id: string;
      platform: string;
      name: string;
    },
    @Req() req: DeviceControllerRequest,
  ) {
    return this.deviceService.registerPendingDevice({
      ...body,
      organizationId: req.deviceBinding.companyId,
      userId: req.deviceBinding.userId,
    });
  }

  @Post('pairing-code')
  async createPairingCode(
    @Body() body: { keledon_id: string },
    @Req() req: DeviceControllerRequest,
  ) {
    const keledonId = req.deviceBinding.keledonId;
    if (!keledonId)
      throw new ForbiddenException('Authorized Keledon binding required');
    const code = await this.deviceService.generatePairingCode(
      req.deviceBinding.userId,
      req.deviceBinding.companyId,
      keledonId,
    );
    return { pairing_code: code };
  }

  @Get()
  async getDevices(@Req() req: DeviceControllerRequest) {
    const actor = req.actor;
    const devices =
      actor.role === 'superadmin'
        ? await this.deviceService.getAllDevices()
        : ['admin', 'coordinator'].includes(actor.role)
          ? await this.deviceService.getDevicesByOrganization(actor.companyId)
          : await this.deviceService.getDevicesByUser(actor.id);
    return devices.map((device) => {
      const { authToken, pairingCode, pairingCodeExpiresAt, ...safeDevice } =
        device;
      void authToken;
      void pairingCode;
      void pairingCodeExpiresAt;
      return safeDevice;
    });
  }

  @Get(':id/rpa-config')
  @Public()
  async getRpaConfig(
    @Param('id') deviceId: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) return { error: 'Unauthorized' };
    const validation = await this.deviceService.validateAuthToken(token);
    if (!validation.valid || validation.deviceId !== deviceId) {
      return { error: 'Unauthorized' };
    }
    return this.deviceService.getRpaConfig(deviceId);
  }

  @Get(':id/status')
  async getDeviceStatus(@Param('id') deviceId: string) {
    const device = await this.deviceService.getDeviceStatus(deviceId);
    return {
      device_id: deviceId,
      status: device?.status || 'unknown',
      last_seen: device?.lastSeen,
    };
  }

  @Delete(':id')
  async revokeDevice(@Param('id') deviceId: string) {
    return this.deviceService.revokeDevice(deviceId);
  }

  @Get('test-browser')
  async testBrowser() {
    const pairingCode = this.generateTestPairingCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.deviceService.createTestDevice(pairingCode, expiresAt);

    return {
      test_url: `keledon://launch?keledonId=test-keledon&code=${pairingCode}&userId=test-user&timestamp=${Date.now()}&signature=testsig&cloudUrl=https%3A%2F%2Fkeledon.tuyoisaza.com`,
      pairing_code: pairingCode,
      expires_at: expiresAt.toISOString(),
      instructions:
        '1. Click test link or open keledon:// URL\n2. Browser app opens\n3. Device pairs with cloud\n4. Auto-login to vendor portal',
    };
  }

  private generateTestPairingCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
