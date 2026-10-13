import { createContext } from 'react';

export type UserRole = 'guest' | 'user' | 'agent' | 'admin' | 'coordinator' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  companyId?: string;
  teamId?: string;
  companyName?: string;
  brandName?: string;
  teamName?: string;
  createdAt?: string;
  lastSession?: string;
  company_id?: string;
  team_id?: string;
  company_name?: string;
  brand_name?: string;
  team_name?: string;
  created_at?: string;
  last_session?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearLocalSession: () => void;
  hasRole: (minRole: UserRole) => boolean;
  isActuallySuperAdmin: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
