import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VoiceProviderRegistry } from './providers/voice-provider.registry';
import { VoicePipelineStatus } from './providers/voice-provider.interface';
import { AuthGuard } from '../guards/auth.guard';

/**
 * Read-only status endpoint for the voice pipeline provider registry.
 * Returns the resolved provider config and health state for a team.
 * Used by the BrainPage Side Panel to display active provider status.
 */
@Controller('api/voice-provider')
@UseGuards(AuthGuard)
export class VoiceProviderController {
  constructor(private readonly registry: VoiceProviderRegistry) {}

  @Get('status/:sessionId')
  getStatus(@Param('sessionId') sessionId: string): VoicePipelineStatus | { error: string } {
    const status = this.registry.getPipelineStatus(sessionId);
    if (!status) {
      return { error: `No active session: ${sessionId}` };
    }
    return status;
  }
}
