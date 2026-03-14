import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'guest' | 'user' | 'agent' | 'admin' | 'coordinator' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  company_id?: string;
  team_id?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isActuallySuperAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (minRole: UserRole) => boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const roleHierarchy: UserRole[] = ['guest', 'user', 'agent', 'admin', 'coordinator', 'superadmin'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isActuallySuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    let isMounted = true;

    async function hydrateFromSession() {
      if (!supabase) {
        if (!isMounted) return;
        setError('Supabase is not configured. MVP requires real Supabase auth.');
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!isMounted) return;

        if (!session?.user) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, company_id, team_id, name')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            // Real though empty: if profile row missing, default to role=user without inventing IDs.
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.full_name || 'User',
              email: session.user.email || '',
              role: 'user',
              avatar: session.user.user_metadata?.avatar_url,
            });
          } else {
            setUser({
              id: session.user.id,
              name: userData?.name || session.user.user_metadata?.full_name || 'User',
              email: session.user.email || '',
              role: (userData?.role as UserRole) || 'user',
              company_id: userData?.company_id,
              team_id: userData?.team_id,
              avatar: session.user.user_metadata?.avatar_url,
            });
          }
        } catch {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || 'User',
            email: session.user.email || '',
            role: 'user',
            avatar: session.user.user_metadata?.avatar_url,
          });
        }
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load auth session');
        setUser(null);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    hydrateFromSession();

    const { data } = supabase?.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        return;
      }

      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role, company_id, team_id, name')
          .eq('id', session.user.id)
          .single();

        setUser({
          id: session.user.id,
          name: userData?.name || session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          role: (userData?.role as UserRole) || 'user',
          company_id: userData?.company_id,
          team_id: userData?.team_id,
          avatar: session.user.user_metadata?.avatar_url,
        });
      } catch {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          role: 'user',
        });
      }
    }) || { data: null };

    return () => {
      isMounted = false;
      data?.subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    // MVP fallback: allow demo login if no Supabase configured
    if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
      setUser({
        id: 'demo-user-' + Date.now(),
        name: 'Demo User',
        email: 'demo@keledon.ai',
        role: 'admin',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: import.meta.env.VITE_SUPABASE_GOOGLE_REDIRECT,
      },
    });
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    // MVP fallback: allow demo login if no Supabase configured
    if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
      setUser({
        id: 'demo-' + Date.now(),
        name: email.split('@')[0],
        email,
        role: 'admin',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setError(null);
    await supabase?.auth.signOut();
    window.location.href = '/';
  }, []);

  const hasRole = useCallback((minRole: UserRole) => {
    const currentRole = user?.role || 'guest';
    return roleHierarchy.indexOf(currentRole) >= roleHierarchy.indexOf(minRole);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isActuallySuperAdmin,
        loginWithGoogle,
        signInWithEmail,
        logout,
        hasRole,
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
