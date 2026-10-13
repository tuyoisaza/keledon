import { useState, useEffect, type ReactNode } from 'react';
import { recordAuthEvent } from '@/lib/debug-report';
import { debugLogger } from '@/lib/debug-logger';
import { AuthContext, type User, type UserRole } from './auth-context';

const roleHierarchy: UserRole[] = ['guest', 'user', 'agent', 'admin', 'coordinator', 'superadmin'];

const API_URL = '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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
