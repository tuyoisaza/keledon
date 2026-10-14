import type { Socket } from 'socket.io';
import type { PrismaService } from '../prisma/prisma.service';
import { LocalAuthService } from '../auth-local/auth-local.service';

export async function authorizeDashboardSocket(
  client: Socket,
  prisma: PrismaService,
  sendInitialData: (client: Socket) => void,
): Promise<void> {
  const auth: unknown = client.handshake.auth;
  const token =
    typeof auth === 'object' && auth !== null && 'token' in auth
      ? auth.token
      : undefined;
  if (typeof token !== 'string' || !token) {
    client.emit('error', { message: 'Dashboard authentication required' });
    client.disconnect(true);
    return;
  }

  try {
    const sessionActor = await new LocalAuthService(prisma).validateToken(
      token,
    );
    if (!sessionActor?.id) {
      client.emit('error', { message: 'Dashboard authentication required' });
      client.disconnect(true);
      return;
    }
    const actor = await prisma.user.findUnique({
      where: { id: sessionActor.id },
      select: { id: true, role: true },
    });
    if (!actor || actor.role !== 'superadmin') {
      client.emit('error', {
        message: 'Superadmin dashboard access required',
      });
      client.disconnect(true);
      return;
    }
    Object.assign(client.data, { dashboardActorId: actor.id });
    console.log(`Dashboard client connected: ${client.id}`);

    // Send initial platform-wide data only after DB role validation.
    sendInitialData(client);
  } catch {
    client.emit('error', { message: 'Dashboard authentication failed' });
    client.disconnect(true);
  }
}
