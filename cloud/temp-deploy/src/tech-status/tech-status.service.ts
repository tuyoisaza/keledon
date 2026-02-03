import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface DependencyInfo {
    name: string;
    currentVersion: string;
    latestVersion: string;
    hasUpdate: boolean;
    module: 'cloud' | 'landing' | 'agent';
}

interface TechStackItem {
    name: string;
    version: string;
    category: 'frontend' | 'backend' | 'realtime' | 'other';
    icon?: string;
}

interface ServerStatus {
    status: 'online' | 'offline' | 'degraded';
    uptime: number;
    nodeVersion: string;
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
}

export interface TechStatusResponse {
    server: ServerStatus;
    techStack: TechStackItem[];
    dependencies: DependencyInfo[];
}

@Injectable()
export class TechStatusService {
    private readonly projectRoot: string;

    constructor() {
        // Navigate from cloud/src to project root
        this.projectRoot = path.resolve(__dirname, '..', '..');
    }

    async getTechStatus(): Promise<TechStatusResponse> {
        const [server, techStack, dependencies] = await Promise.all([
            this.getServerStatus(),
            this.getTechStack(),
            this.getDependencies(),
        ]);

        return { server, techStack, dependencies };
    }

    private getServerStatus(): ServerStatus {
        const memUsage = process.memoryUsage();
        const totalMemory = require('os').totalmem();
        const usedMemory = totalMemory - require('os').freemem();

        return {
            status: 'online',
            uptime: process.uptime(),
            nodeVersion: process.version,
            memoryUsage: {
                used: usedMemory,
                total: totalMemory,
                percentage: Math.round((usedMemory / totalMemory) * 100),
            },
        };
    }

    private async getTechStack(): Promise<TechStackItem[]> {
        const packages = await this.getAllPackageJsons();
        const techStack: TechStackItem[] = [];

        // Frontend technologies
        const reactVersion = this.findVersion(packages, 'react');
        if (reactVersion) {
            techStack.push({ name: 'React', version: reactVersion, category: 'frontend', icon: '⚛️' });
        }

        const viteVersion = this.findVersion(packages, 'vite');
        if (viteVersion) {
            techStack.push({ name: 'Vite', version: viteVersion, category: 'frontend', icon: '⚡' });
        }

        // Backend technologies
        const nestVersion = this.findVersion(packages, '@nestjs/core');
        if (nestVersion) {
            techStack.push({ name: 'NestJS', version: nestVersion, category: 'backend', icon: '🪺' });
        }

        // TypeScript
        const tsVersion = this.findVersion(packages, 'typescript');
        if (tsVersion) {
            techStack.push({ name: 'TypeScript', version: tsVersion, category: 'other', icon: '📘' });
        }

        // Real-time
        const socketVersion = this.findVersion(packages, 'socket.io') || this.findVersion(packages, 'socket.io-client');
        if (socketVersion) {
            techStack.push({ name: 'Socket.io', version: socketVersion, category: 'realtime', icon: '🔌' });
        }

        // Node.js
        techStack.push({ name: 'Node.js', version: process.version.replace('v', ''), category: 'backend', icon: '🟢' });

        return techStack;
    }

    private findVersion(packages: { dependencies: Record<string, string>; devDependencies: Record<string, string> }[], packageName: string): string | null {
        for (const pkg of packages) {
            const version = pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName];
            if (version) {
                return version.replace(/^\^|~/, '');
            }
        }
        return null;
    }

    private async getAllPackageJsons(): Promise<{ dependencies: Record<string, string>; devDependencies: Record<string, string>; name: string }[]> {
        const modules = ['cloud', 'landing', 'agent'];
        const packages: { dependencies: Record<string, string>; devDependencies: Record<string, string>; name: string }[] = [];

        for (const module of modules) {
            try {
                const packagePath = path.join(this.projectRoot, module, 'package.json');
                const content = fs.readFileSync(packagePath, 'utf-8');
                const pkg = JSON.parse(content);
                packages.push({
                    name: module,
                    dependencies: pkg.dependencies || {},
                    devDependencies: pkg.devDependencies || {},
                });
            } catch {
                // Module package.json not found, skip
            }
        }

        return packages;
    }

    private async getDependencies(): Promise<DependencyInfo[]> {
        const modules: ('cloud' | 'landing' | 'agent')[] = ['cloud', 'landing', 'agent'];
        const dependencies: DependencyInfo[] = [];
        const seenPackages = new Set<string>();

        for (const module of modules) {
            try {
                const packagePath = path.join(this.projectRoot, module, 'package.json');
                const content = fs.readFileSync(packagePath, 'utf-8');
                const pkg = JSON.parse(content);

                const allDeps = {
                    ...(pkg.dependencies || {}),
                    ...(pkg.devDependencies || {}),
                };

                for (const [name, version] of Object.entries(allDeps)) {
                    if (seenPackages.has(name)) continue;
                    seenPackages.add(name);

                    const currentVersion = (version as string).replace(/^\^|~/, '');

                    // For now, we'll mark hasUpdate as false - in a production app,
                    // you'd query the npm registry for the latest version
                    dependencies.push({
                        name,
                        currentVersion,
                        latestVersion: currentVersion, // Would fetch from npm registry
                        hasUpdate: false,
                        module,
                    });
                }
            } catch {
                // Module package.json not found, skip
            }
        }

        // Sort alphabetically
        return dependencies.sort((a, b) => a.name.localeCompare(b.name));
    }

    async checkForUpdates(dependencies: DependencyInfo[]): Promise<DependencyInfo[]> {
        // Check npm registry for latest versions
        const updatedDeps = await Promise.all(
            dependencies.slice(0, 20).map(async (dep) => {
                try {
                    const response = await fetch(`https://registry.npmjs.org/${dep.name}/latest`, {
                        headers: { Accept: 'application/json' },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const latestVersion = data.version;
                        return {
                            ...dep,
                            latestVersion,
                            hasUpdate: this.compareVersions(dep.currentVersion, latestVersion) < 0,
                        };
                    }
                } catch {
                    // Failed to fetch, return original
                }
                return dep;
            })
        );

        // Return updated ones + the rest unchanged
        return [...updatedDeps, ...dependencies.slice(20)];
    }

    private compareVersions(current: string, latest: string): number {
        const currentParts = current.split('.').map(Number);
        const latestParts = latest.split('.').map(Number);

        for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
            const c = currentParts[i] || 0;
            const l = latestParts[i] || 0;
            if (c < l) return -1;
            if (c > l) return 1;
        }
        return 0;
    }
}
