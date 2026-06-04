import type { BrainChatMessage } from '@/lib/crud-api';

export type ChatRole = BrainChatMessage['role'];

export interface ChatLine {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}
