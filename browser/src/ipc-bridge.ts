import log from 'electron-log';
import { session } from 'electron';

/**
 * Lazy-loaded auto-browse bridge (cached after first import).
 */
let autobrowseBridge: typeof import('./autobrowse-bridge.js') | null = null;

export async function getAutoBrowseBridge() {
  if (!autobrowseBridge) {
    autobrowseBridge = await import('./autobrowse-bridge.js');
  }
  return autobrowseBridge;
}

// ===================== AUTO-BROWSE ENGINE =====================

export async function initializeAutoBrowseEngine(): Promise<void> {
  const bridge = await getAutoBrowseBridge();
  if (bridge.isAutoBrowseInitialized()) {
    log.info('[Main] AutoBrowse engine already initialized');
    return;
  }

  try {
    const electronSession = session.defaultSession;
    if (!electronSession) {
      throw new Error('Default session not available');
    }

    const electronSessionData = {
      defaultSession: {
        debuggerWebSocketUrl: process.env.CDP_URL || 'ws://localhost:9222',
      },
    };

    await bridge.initializeAutoBrowse(electronSessionData as any);
    log.info('[Main] AutoBrowse engine initialized successfully');
  } catch (error) {
    log.error('[Main] Failed to initialize AutoBrowse:', error);
    throw error;
  }
}
