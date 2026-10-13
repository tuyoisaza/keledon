import { Controller, Get, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { VoiceProviderRegistry } from './providers/voice-provider.registry';
import { VoicePipelineStatus } from './providers/voice-provider.interface';
import { Public } from '../guards/public.decorator';
import { RuntimeActorGuard, ownsRuntimeSession } from '../gateways/runtime-identity';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Read-only status endpoint for the voice pipeline provider registry.
 * Returns the resolved provider config and health state for a team.
 * Used by the BrainPage Side Panel to display active provider status.
 */
@Controller('api/voice-provider')
@Public()
@UseGuards(RuntimeActorGuard)
export class VoiceProviderController {
  constructor(private readonly registry: VoiceProviderRegistry, private readonly prisma: PrismaService) {}

  @Get('status/:sessionId')
  async getStatus(
    @Param('sessionId') sessionId: string,
    @Req() request: any,
  ): Promise<VoicePipelineStatus | { error: string }> {
    if (!await ownsRuntimeSession(this.prisma, request.runtimeIdentity, sessionId)) throw new ForbiddenException('Session scope mismatch');
    const status = this.registry.getPipelineStatus(sessionId);
    if (!status) {
      return { error: `No active session: ${sessionId}` };
    }
    return status;
  }
}
