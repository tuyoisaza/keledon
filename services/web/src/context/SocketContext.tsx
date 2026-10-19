import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WEBSOCKET_URL } from '@/lib/config';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Context modules intentionally export their provider and paired hook from one file.
// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: React.ReactNode;
}

/** Fetch the cloud Brain WebSocket URL from the API, falling back to env var */
async function resolveWsUrl(): Promise<string> {
  // If an explicit env var is set, use it directly (bypass cloud-config)
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL;
  }
  try {
    const res = await fetch('/api/cloud-config', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const config = await res.json();
      if (config.ws_url) {
        console.log('[SocketContext] Using cloud-config WS URL:', config.ws_url);
        return config.ws_url;
      }
    }
  } catch (e) {
    console.warn('[SocketContext] Failed to fetch cloud-config, falling back:', e);
  }
  return WEBSOCKET_URL;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { user, isLoading } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    if (isLoading || !user || user.uatTestProfile) {
      setSocket(null);
      setConnected(false);
      setConnecting(false);
      return;
    }
    let newSocket: Socket | null = null;
    let active = true;

    resolveWsUrl().then((url) => {
      if (!active) return;
      setConnecting(true);
      newSocket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        auth: {
          token: (() => {
            try {
              return sessionStorage.getItem('auth_token') || '';
            } catch {
              return '';
            }
          })(),
        },
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket!.id);
        setConnected(true);
        setConnecting(false);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnecting(false);
      });

      setSocket(newSocket);
    });

    return () => {
      active = false;
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [isLoading, user?.id, user?.uatTestProfile]);

  const value: SocketContextType = {
    socket,
    connected,
    connecting,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
