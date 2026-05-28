import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';

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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (minRole: UserRole) => boolean;
  isActuallySuperAdmin: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const roleHierarchy: UserRole[] = ['guest', 'user', 'agent', 'admin', 'coordinator', 'superadmin'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.user) {
          setUser(data.user);
        } else {
          sessionStorage.removeItem('auth_token');
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const loginWithGoogle = async () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    setIsLoading(false);

    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.token) {
      sessionStorage.setItem('auth_token', data.token);
    }

    setUser(data.user);
  };

  const logout = async () => {
    sessionStorage.removeItem('auth_token');
    setUser(null);
    window.location.href = '/';
  };

  const isActuallySuperAdmin = user?.role === 'superadmin';

  const hasRole = (minRole: UserRole) => {
    const currentRole = user?.role || 'guest';
    return roleHierarchy.indexOf(currentRole) >= roleHierarchy.indexOf(minRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        signInWithEmail,
        logout,
        hasRole,
        isActuallySuperAdmin,
        email,
        setEmail,
        password,
        setPassword,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
