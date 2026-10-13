import { createContext } from 'react';
import type { Socket } from 'socket.io-client';

export interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);
