import { Injectable } from '@nestjs/common';
import {
    RpaProvider,
    RpaProviderConfig,
    StandardAction,
    RpaExecutionResult,
} from './capabilities/rpa/interfaces/rpa-provider.interface';
import { ContentScriptsProvider } from './providers/content-scripts.provider';
import { PlaywrightMcpProvider } from './providers/playwright-mcp.provider';
import { LocalHttpRpaProvider } from './providers/local-rpa.provider';

export interface ProviderInfo {
    id: string;
    name: string;
    description: string;
    requiresBackend: boolean;
    requiresApiKey: boolean;
}

/**
 * RpaFactory - Creates and manages RPA providers
 * 
 * Supports Content Scripts (Browser) and Playwright MCP (Server)
 */
@Injectable()
export class RpaFactory {
    private providers = new Map<string, RpaProvider>();
    private activeProvider: RpaProvider | null = null;

    private availableProviders: ProviderInfo[] = [
        {
            id: 'native-dom',
            name: 'Native DOM Automation',
            description: 'Browser APIs and DOM-native execution',
            requiresBackend: false,
            requiresApiKey: false,
        },
        {
            id: 'chrome-mv3',
            name: 'Chrome Extensions (MV3)',
            description: 'Manifest V3 extension automation',
            requiresBackend: false,
            requiresApiKey: false,
        },
        {
            id: 'playwright',
            name: 'Playwright',
            description: 'Server-side automation via Playwright MCP',
            requiresBackend: true,
            requiresApiKey: false,
        },
        {
            id: 'local-http',
            name: 'Local RPA Endpoint',
            description: 'HTTP-based local automation runtime',
            requiresBackend: true,
            requiresApiKey: false,
        },
    ];

    constructor() {
        this.providers.set('native-dom', new ContentScriptsProvider());
        this.providers.set('chrome-mv3', new ContentScriptsProvider());
        this.providers.set('playwright', new PlaywrightMcpProvider());
        this.providers.set('local-http', new LocalHttpRpaProvider());

        // Backward-compatible aliases
        this.providers.set('content-scripts', this.providers.get('native-dom')!);
        this.providers.set('playwright-mcp', this.providers.get('playwright')!);
    }

    getAvailableProviders(): ProviderInfo[] {
        return this.availableProviders;
    }

    getProvider(id: string): RpaProvider | undefined {
        return this.providers.get(id);
    }

    async configure(providerId: string, config: RpaProviderConfig): Promise<void> {
        const provider = this.providers.get(providerId);

        if (!provider) {
            // Backward compatibility or fallback
            if (providerId === 'puppeteer' || providerId === 'playwright') {
                console.warn(`Provider ${providerId} is deprecated or not installed. Using playwright-mcp if available.`);
            }
            throw new Error(`Unknown provider: ${providerId}`);
        }

        // Configure the provider (connect)
        if (!provider.isConnected()) {
            await provider.connect(config);
        }

        this.activeProvider = provider;
        console.log(`RPA Provider configured: ${providerId}`);
    }

    getActiveProvider(): RpaProvider | null {
        return this.activeProvider || this.providers.get('content-scripts') || null;
    }

    async execute(action: StandardAction, variables: Record<string, string>): Promise<RpaExecutionResult> {
        const provider = this.getActiveProvider();
        if (!provider) {
            return {
                success: false,
                actionId: action.id,
                error: 'No RPA provider configured',
                durationMs: 0,
            };
        }
        return provider.execute(action, variables);
    }
}
