import { AuthAttemptGuard } from '../guards/auth-attempt.guard';
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { Public } from '../guards/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import { DeviceAccessGuard } from '../guards/device-access.guard';

@ApiTags('Devices')
@Controller('api/devices')
@UseGuards(DeviceAccessGuard)
export class DeviceController {
  constructor(private deviceService: DeviceService) {}

  @Public()
  @Post('pair')
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
      return { error: 'Invalid pairing request or expired proof' };
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
    @Req() req: any,
  ) {
    return this.deviceService.registerPendingDevice({
      ...body,
      organizationId: req.deviceBinding.companyId,
      userId: req.deviceBinding.userId,
    });
  }

  @Post('pairing-code')
  async createPairingCode(
    @Body()
    body: {
      userId?: string;
      organizationId?: string;
      keledon_id?: string;
    },
    @Req() req: any,
  ) {
    const { code, device_id } = await this.deviceService.generatePairingCode(
      req.deviceBinding.userId,
      req.deviceBinding.companyId,
      req.deviceBinding.keledonId,
    );
    return { pairing_code: code, device_id };
  }

  @Get()
  async getDevices(@Req() req: any) {
    const actor = req.actor;
    const rows =
      actor.role === 'superadmin'
        ? await this.deviceService.getAllDevices()
        : ['admin', 'coordinator'].includes(actor.role)
          ? await this.deviceService.getDevicesByOrganization(actor.companyId)
          : await this.deviceService.getDevicesByUser(actor.id);
    return rows.map((row) => {
      const device: Record<string, unknown> = { ...row };
      const hasRpaProviderConfig = !!device.rpaProviderConfig;
      const hasCdpUrl = !!device.cdpUrl;
      delete device.authToken;
      delete device.pairingCode;
      delete device.pairingCodeExpiresAt;
      delete device.rpaProviderConfig;
      delete device.cdpUrl;
      return { ...device, hasRpaProviderConfig, hasCdpUrl };
    });
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
    await this.deviceService.revokeDevice(deviceId);
    return { success: true };
  }

  @Get('debug/device/:id')
  async debugDevice(@Param('id') keledonId: string) {
    return this.deviceService.getDeviceDebug(keledonId);
  }

  @Public()
  @Get(':id/rpa-config')
  async getDeviceRpaConfig(@Param('id') deviceId: string) {
    return this.deviceService.getRpaProviderConfig(deviceId);
  }

  @Put(':id/rpa-config')
  async updateDeviceRpaConfig(
    @Param('id') deviceId: string,
    @Body()
    body: {
      chain: string[];
      providers: Record<string, any>;
      fallback?: boolean;
    },
  ) {
    return this.deviceService.updateRpaProviderConfig(deviceId, body);
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
