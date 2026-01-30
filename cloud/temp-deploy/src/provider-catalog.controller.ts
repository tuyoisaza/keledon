import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

interface ProviderCatalogEntry {
    id: string;
    type: string;
    name: string;
    description?: string;
    status?: string;
    is_enabled?: boolean;
    metadata?: Record<string, any>;
}

@Controller('api/provider-catalog')
export class ProviderCatalogController {
    constructor(private readonly supabaseService: SupabaseService) { }

    @Get()
    async getProviderCatalog(
        @Query('autoStart') autoStart?: string,
        @Query('localOnly') localOnly?: string
    ): Promise<ProviderCatalogEntry[]> {
        let entries: ProviderCatalogEntry[] = [];
        try {
            entries = await this.supabaseService.getProviderCatalog();
        } catch (error) {
            throw new HttpException('Provider catalog unavailable', HttpStatus.SERVICE_UNAVAILABLE);
        }

        const filterAutoStart = autoStart === 'true';
        const filterLocalOnly = localOnly === 'true';

        return entries
            .filter(entry => entry.is_enabled !== false && entry.status !== 'deprecated')
            .filter(entry => {
                if (!filterAutoStart) return true;
                const metadata = entry.metadata || {};
                return this.getBoolean(metadata.auto_start);
            })
            .filter(entry => {
                if (!filterLocalOnly) return true;
                const metadata = entry.metadata || {};
                const requiresApiKey = this.getBoolean(metadata.requires_api_key);
                if (!requiresApiKey) return true;
                const requiredEnv = this.getRequiredEnv(metadata);
                if (requiredEnv.length === 0) return false;
                return requiredEnv.every((key) => Boolean(process.env[key]));
            });
    }

    private getBoolean(value: unknown): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value.toLowerCase() === 'true';
        return false;
    }

    private getRequiredEnv(metadata: Record<string, any>): string[] {
        const raw = metadata.required_env ?? metadata.requiredEnv ?? metadata.api_key_env;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.map(value => String(value).trim()).filter(Boolean);
        return String(raw)
            .split(/[,\n\s]+/)
            .map(value => value.trim())
            .filter(Boolean);
    }
}
