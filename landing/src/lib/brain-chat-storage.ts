import type { BrainChatMessage } from '@/lib/crud-api';

export type ChatRole = BrainChatMessage['role'];

export interface ChatLine {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: string;
}

const STORAGE_KEY = 'keledon-brain-context';
export const AUTOSPEAK_KEY = 'keledon-brain-autospeak';

export function storageKeyFor(userId?: string) {
    return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

export function readStoredContext(key: string) {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveStoredContext(key: string, data: Record<string, string | undefined>) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(data));
}
