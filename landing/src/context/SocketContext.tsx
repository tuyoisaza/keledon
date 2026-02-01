import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

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

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001';

    setConnecting(true);
    
    const newSocket = io(socketUrl, {
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

    setSocket(newSocket);

    return () => {
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