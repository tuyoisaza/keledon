import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AutonomyContext } from '../interfaces/action.interface';

@Injectable()
export class ContextService {
    private readonly logger = new Logger(ContextService.name);

    constructor(private readonly supabase: SupabaseService) { }

    /**
     * Loads the Autonomy Context for a given Agent ID.
     * If no agentId is provided (anonymous), returns default Level 1 context.
     */
    async loadContext(agentId?: string): Promise<AutonomyContext> {
        if (!agentId) {
            return this.getDefaultContext();
        }

        try {
            const { data, error } = await this.supabase.getClient()
                .from('agents')
                .select('id, autonomy_level, policies, team_id, teams ( brand_id, brands ( company_id ) )')
                .eq('id', agentId)
                .single();

            if (error || !data) {
                this.logger.warn(`Failed to load context for agent ${agentId}, using default. Error: ${error?.message}`);
                return this.getDefaultContext();
            }

            const teamEntry = Array.isArray(data?.teams) ? data.teams[0] : data?.teams;
            const brandEntry = Array.isArray(teamEntry?.brands) ? teamEntry.brands[0] : teamEntry?.brands;

            return {
                accountId: brandEntry?.company_id || data.team_id || 'unknown-account',
                level: data.autonomy_level || 1,
                features: [] // could parse from policies
            };

        } catch (err) {
            this.logger.error(`Error loading context: ${err.message}`);
            return this.getDefaultContext();
        }
    }

    private getDefaultContext(): AutonomyContext {
        return {
            accountId: 'anonymous',
            level: 2, // Testing default: Allow navigation and flows
            features: []
        };
    }
}
