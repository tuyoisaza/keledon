import { Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { isRuntimeIdentityCurrent } from '../gateways/runtime-identity';
import { VoiceSession } from './voice.types';

export async function getAuthorizedVoiceSession(
  prisma: PrismaService | undefined,
  activeSessions: Map<string, VoiceSession>,
  client: Socket,
): Promise<VoiceSession | undefined> {
  const session = activeSessions.get(client.id);
  if (
    !session ||
    !prisma ||
    !(await isRuntimeIdentityCurrent(prisma, client.data.runtimeIdentity))
  ) {
    client.disconnect();
    return undefined;
  }
  return session;
}

export function listVoiceSessionSummaries(
  activeSessions: Map<string, VoiceSession>,
  clientId: string,
) {
  return Array.from(activeSessions.entries())
    .filter(([id]) => id === clientId)
    .map(([, session]) => ({
      device_id: session.deviceId,
      session_id: session.sessionId,
      started_at: session.startedAt.toISOString(),
      transcript_length: session.transcript.length,
    }));
}
