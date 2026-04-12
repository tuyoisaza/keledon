/**
 * Device Manager - Handles device registration and pairing with Cloud
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface DeviceInfo {
  deviceId: string;
  machineId: string;
  name: string;
  platform: string;
  createdAt: string;
  lastSeen: string;
  status: 'pending' | 'paired' | 'disconnected';
}

export interface PairingResponse {
  device_id: string;
  auth_token: string;
  cloud_url: string;
}

export interface DeviceConfig {
  dataDir: string;
}

export class DeviceManager {
  private config: DeviceConfig;
  private deviceInfo: DeviceInfo | null = null;
  private authToken: string | null = null;
  private cloudUrl: string | null = null;

  constructor(config: DeviceConfig) {
    this.config = config;
    this.ensureDataDir();
    this.loadDeviceInfo();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }
  }

  private getDeviceInfoPath(): string {
    return path.join(this.config.dataDir, 'device.json');
  }

  private getAuthPath(): string {
    return path.join(this.config.dataDir, 'auth.json');
  }

  private loadDeviceInfo(): void {
    try {
      const devicePath = this.getDeviceInfoPath();
      if (fs.existsSync(devicePath)) {
        this.deviceInfo = JSON.parse(fs.readFileSync(devicePath, 'utf-8'));
      }

      const authPath = this.getAuthPath();
      if (fs.existsSync(authPath)) {
        const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        this.authToken = auth.token;
        this.cloudUrl = auth.cloudUrl;
      }
    } catch (error) {
      console.error('Failed to load device info:', error);
    }
  }

  getOrCreateDevice(): DeviceInfo {
    if (this.deviceInfo) {
      this.deviceInfo.lastSeen = new Date().toISOString();
      this.saveDeviceInfo();
      return this.deviceInfo;
    }

    this.deviceInfo = {
      deviceId: `device-${crypto.randomUUID()}`,
      machineId: this.generateMachineId(),
      name: `KELEDON-${require('os').hostname()}`,
      platform: process.platform,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: 'pending'
    };

    this.saveDeviceInfo();
    return this.deviceInfo;
  }

  private generateMachineId(): string {
    const machineInfo = [
      require('os').hostname(),
      require('os').platform(),
      require('os').arch()
    ].join('-');
    
    return crypto.createHash('sha256').update(machineInfo).digest('hex').slice(0, 16);
  }

  private saveDeviceInfo(): void {
    if (this.deviceInfo) {
      fs.writeFileSync(this.getDeviceInfoPath(), JSON.stringify(this.deviceInfo, null, 2));
    }
  }

  async pairWithCloud(cloudUrl: string, pairingCode: string): Promise<PairingResponse> {
    const device = this.getOrCreateDevice();

    const response = await fetch(`${cloudUrl}/api/devices/pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_id: device.deviceId,
        machine_id: device.machineId,
        pairing_code: pairingCode,
        platform: device.platform,
        name: device.name
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pairing failed: ${response.status} - ${error}`);
    }

    const pairingResult: PairingResponse = await response.json();

    this.authToken = pairingResult.auth_token;
    this.cloudUrl = pairingResult.cloud_url;

    this.saveAuth();

    if (this.deviceInfo) {
      this.deviceInfo.status = 'paired';
      this.saveDeviceInfo();
    }

    return pairingResult;
  }

  private saveAuth(): void {
    fs.writeFileSync(this.getAuthPath(), JSON.stringify({
      token: this.authToken,
      cloudUrl: this.cloudUrl
    }, null, 2));
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  getCloudUrl(): string | null {
    return this.cloudUrl;
  }

  isPaired(): boolean {
    return this.authToken !== null && this.cloudUrl !== null;
  }

  unpair(): void {
    this.authToken = null;
    this.cloudUrl = null;

    if (fs.existsSync(this.getAuthPath())) {
      fs.unlinkSync(this.getAuthPath());
    }

    if (this.deviceInfo) {
      this.deviceInfo.status = 'pending';
      this.saveDeviceInfo();
    }
  }
}