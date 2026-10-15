import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { recordAuthEvent } from '@/lib/debug-report';
import { debugLogger } from '@/lib/debug-logger';

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
  uatTestProfile?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearLocalSession: () => void;
  switchToUatTestProfile: (profileId: string) => Promise<void>;
  returnToSuperAdmin: () => Promise<void>;
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

  const switchToUatTestProfile = async (profileId: string) => {
    const adminToken = sessionStorage.getItem('auth_token');
    if (!adminToken || user?.role !== 'superadmin' || !profileId) {
      throw new Error('A current superadmin session is required');
    }

    const response = await fetch(`${API_URL}/api/auth/uat-test-profiles/switch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profileId }),
    });
    if (!response.ok) throw new Error('UAT test profile could not be started');
    const data = await response.json();
    if (
      !data?.token ||
      !data?.sessionId ||
      !data?.user?.id ||
      !['user', 'admin', 'coordinator'].includes(data.user.role)
    ) {
      throw new Error('UAT test profile response was invalid');
    }

    sessionStorage.setItem('uat_original_superadmin_token', adminToken);
    sessionStorage.setItem('uat_active_profile_session_id', data.sessionId);
    sessionStorage.setItem('auth_token', data.token);
    setUser(data.user);
  };

  const returnToSuperAdmin = async () => {
    const adminToken = sessionStorage.getItem('uat_original_superadmin_token');
    const sessionId = sessionStorage.getItem('uat_active_profile_session_id');
    if (!adminToken || !sessionId) {
      throw new Error('The original superadmin session is unavailable');
    }

    const response = await fetch(`${API_URL}/api/auth/uat-test-profiles/return`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) {
      throw new Error('UAT test profile could not be ended');
    }

    const adminResponse = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await adminResponse.json();
    if (!adminResponse.ok || data?.user?.role !== 'superadmin') {
      throw new Error('The original superadmin session is no longer valid');
    }

    sessionStorage.setItem('auth_token', adminToken);
    sessionStorage.removeItem('uat_original_superadmin_token');
    sessionStorage.removeItem('uat_active_profile_session_id');
    setUser(data.user);
  };

  useEffect(() => {
    async function checkAuth() {
      recordAuthEvent('session-check', 'started');
      try {
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
          recordAuthEvent('session-check', 'no-session');
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.user) {
          setUser(data.user);
          recordAuthEvent('session-check', 'success');
        } else {
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('uat_original_superadmin_token');
          sessionStorage.removeItem('uat_active_profile_session_id');
          recordAuthEvent('session-check', 'failure');
        }
      } catch {
        recordAuthEvent('session-check', 'failure');
        debugLogger.log('error', 'Authentication session check failed', { stage: 'session-check' });
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const loginWithGoogle = async () => {
    recordAuthEvent('google-redirect', 'started');
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    recordAuthEvent('email-login', 'started');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error('Authentication failed');
      }

      if (data.token) {
        sessionStorage.removeItem('uat_original_superadmin_token');
        sessionStorage.removeItem('uat_active_profile_session_id');
        sessionStorage.setItem('auth_token', data.token);
      }

      setUser(data.user);
      recordAuthEvent('email-login', 'success');
    } catch (error) {
      recordAuthEvent('email-login', 'failure');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalSession = () => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('uat_original_superadmin_token');
    sessionStorage.removeItem('uat_active_profile_session_id');
    sessionStorage.removeItem('uat_active_profile_session_id');
    setUser(null);
    setEmail('');
    setPassword('');
    setError(null);
  };

  const logout = async () => {
    clearLocalSession();
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
        clearLocalSession,
        switchToUatTestProfile,
        returnToSuperAdmin,
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

// Context modules intentionally export their provider and paired hook from one file.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
