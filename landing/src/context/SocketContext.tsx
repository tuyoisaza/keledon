import React, { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { WEBSOCKET_URL } from '@/lib/config';
import { SocketContext, type SocketContextType } from './socket-context';

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    let active = true;
    const newSocket = io(WEBSOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
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

    // The socket state already starts empty; update it after React has committed the effect.
    queueMicrotask(() => {
      if (active) setSocket(newSocket);
    });

    return () => {
      active = false;
      newSocket.close();
    };
  }, []);

  const value: SocketContextType = {
    socket,
    connected,
    connecting
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
