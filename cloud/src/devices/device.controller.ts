import { Controller, Post, Get, Body, Headers, Param, Delete, UseGuards } from '@nestjs/common';
import { DeviceService } from './device.service';

@Controller('api/devices')
export class DeviceController {
  constructor(private deviceService: DeviceService) {}

  @Post('pair')
  async pairDevice(
    @Body() body: {
      device_id: string;
      machine_id: string;
      pairing_code: string;
      platform: string;
      name: string;
      keledon_id?: string;
    },
    @Headers('x-organization-id') organizationId?: string,
    @Headers('x-user-id') userId?: string
  ) {
    try {
      const result = await this.deviceService.pairDevice({
        ...body,
        organizationId,
        userId
      });
      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  @Post('register')
  async registerDevice(
    @Body() body: {
      device_id: string;
      machine_id: string;
      platform: string;
      name: string;
    },
    @Headers('x-organization-id') organizationId?: string,
    @Headers('x-user-id') userId?: string
  ) {
    return this.deviceService.registerPendingDevice({
      ...body,
      organizationId,
      userId
    });
  }

  @Post('pairing-code')
  async createPairingCode(
    @Body() body: { userId?: string; organizationId?: string; keledon_id?: string }
  ) {
    const code = await this.deviceService.generatePairingCode(
      body.userId,
      body.organizationId,
      body.keledon_id
    );
    return { pairing_code: code };
  }

  @Get()
  async getDevices(
    @Headers('x-user-id') userId?: string,
    @Headers('x-organization-id') organizationId?: string
  ) {
    if (userId) {
      return this.deviceService.getDevicesByUser(userId);
    }
    if (organizationId) {
      return this.deviceService.getDevicesByOrganization(organizationId);
    }
    return { error: 'Missing userId or organizationId header' };
  }

  @Get(':id/status')
  async getDeviceStatus(@Param('id') deviceId: string) {
    const devices = await this.deviceService.getDevicesByUser(deviceId);
    const device = devices.find(d => d.id === deviceId);
    return { 
      device_id: deviceId, 
      status: device?.status || 'unknown',
      last_seen: device?.lastSeen
    };
  }

  @Delete(':id')
  async revokeDevice(@Param('id') deviceId: string) {
    return this.deviceService.revokeDevice(deviceId);
  }
}