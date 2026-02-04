import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { debugLogger } from '@/lib/debug-logger';

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
    originalUser: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isImpersonating: boolean;
    loginWithGoogle: () => Promise<void>;
    loginDemo: (role: UserRole) => void;
    loginDev: (email: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    impersonateUser: (user: User) => void;
    stopImpersonation: () => void;
    hasRole: (minRole: UserRole) => boolean;
    setUserRole: (role: UserRole) => void;
    isActuallySuperAdmin: boolean;
    showSimulationFeatures: boolean;
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    error: string | null;
    setError: (error: string | null) => void;
    setUser: (user: User | null) => void;
}

const roleHierarchy: UserRole[] = ['guest', 'user', 'agent', 'admin', 'coordinator', 'superadmin'];

const mockUsers: Record<UserRole, User> = {
    guest: { id: '0', name: 'Guest', email: '', role: 'guest' },
    user: { id: '4', name: 'Demo User', email: 'user@keledon.ai', role: 'user', company_id: 'demo-company', team_id: 'demo-team' },
    agent: { id: '1', name: 'Demo Agent', email: 'agent@keledon.ai', role: 'agent', company_id: 'demo-company', team_id: 'demo-team' },
    admin: { id: '5', name: 'Demo Admin', email: 'admin@keledon.ai', role: 'admin', company_id: 'demo-company', team_id: 'demo-team' },
    coordinator: { id: '2', name: 'Demo Coordinator', email: 'coord@keledon.ai', role: 'coordinator', company_id: 'demo-company', team_id: 'demo-team' },
    superadmin: { id: '3', name: 'Super Admin', email: 'superadmin@keledon.com', role: 'superadmin' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [originalUser, setOriginalUser] = useState<User | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const userRef = useRef<User | null>(null);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const isActuallySuperAdmin =
        (originalUser?.role === 'superadmin') ||
        (!originalUser && user?.role === 'superadmin');

    const showSimulationFeatures = isActuallySuperAdmin;

    useEffect(() => {
        let isMounted = true;
        let hasSetLoading = false;

        const setLoadingFalse = () => {
            if (!hasSetLoading) {
                hasSetLoading = true;
                setIsLoading(false);
            }
        };

        const loadDemoUser = () => {
            const stored = sessionStorage.getItem('keledon_user');
            if (stored && isMounted) {
                try {
                    setUser(JSON.parse(stored));
                } catch {
                    sessionStorage.removeItem('keledon_user');
                }
            }
            setLoadingFalse();
        };

        const checkSession = async () => {
            if (!supabase) {
                loadDemoUser();
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (!isMounted) return;

            if (session?.user) {
                // Try to get user role from database first
                try {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('role, company_id, team_id, name')
                        .eq('id', session.user.id)
                        .single();

                    const newUser: User = {
                        id: session.user.id,
                        name: userData?.name || session.user.user_metadata?.full_name || 'User',
                        email: session.user.email || '',
                        role: userData?.role as UserRole || 'user',
                        company_id: userData?.company_id,
                        team_id: userData?.team_id,
                        avatar: session.user.user_metadata?.avatar_url,
                    };
                    setUser(newUser);
                } catch (error) {
                    // If user not found in database, create basic user with 'user' role
                    const newUser: User = {
                        id: session.user.id,
                        name: session.user.user_metadata?.full_name || 'User',
                        email: session.user.email || '',
                        role: 'user',
                        avatar: session.user.user_metadata?.avatar_url,
                    };
                    setUser(newUser);
                }
            } else {
                loadDemoUser();
            }

            setLoadingFalse();
        };

        checkSession();

const { data } = supabase?.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;
            if (session?.user) {
                // Try to get user role from database first
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
                        role: userData?.role as UserRole || 'user',
                        company_id: userData?.company_id,
                        team_id: userData?.team_id,
                    });
                } catch (error) {
                    // If user not found in database, create basic user with 'user' role
                    setUser({
                        id: session.user.id,
                        name: session.user.user_metadata?.full_name || 'User',
                        email: session.user.email || '',
                        role: 'user',
                    });
                }
            }
        }) || { data: null };

        return () => {
            isMounted = false;
            data?.subscription.unsubscribe();
        };
    }, []);

    const loginWithGoogle = useCallback(async () => {
        if (!supabase) return;

        setIsLoading(true);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: import.meta.env.VITE_SUPABASE_GOOGLE_REDIRECT,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            alert(error.message);
            setIsLoading(false);
        }
    }, []);

    const loginDemo = useCallback(async (role: UserRole) => {
        // Anti-demo: No mock login - require real authentication
        throw new Error('Demo login not supported. Please use real authentication with valid credentials.');
    }, []);

    const loginDev = useCallback(async (email: string) => {
        if (!supabase) return;
        setIsLoading(true);

        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (data) {
            setUser(data);
            sessionStorage.setItem('keledon_user', JSON.stringify(data));
        }

        setIsLoading(false);
    }, []);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        // Local development bypass for superadmin
        if (email === 'superadmin@keledon.com' && password === '123123') {
            const superadminUser = mockUsers.superadmin;
            setUser(superadminUser);
            sessionStorage.setItem('keledon_user', JSON.stringify(superadminUser));
            setIsLoading(false);
            return;
        }

        if (!supabase) {
            throw new Error('Supabase not available');
        }
        
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setIsLoading(false);
        
        if (error) {
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        sessionStorage.clear();
        setUser(null);
        setOriginalUser(null);
        await supabase?.auth.signOut();
        window.location.href = '/';
    }, []);

    const impersonateUser = useCallback((targetUser: User) => {
        if (!user || !isActuallySuperAdmin) return;
        setOriginalUser(user);
        setUser(targetUser);
        sessionStorage.setItem('keledon_impersonated_user', JSON.stringify(targetUser));
    }, [user, isActuallySuperAdmin]);

    const stopImpersonation = useCallback(() => {
        if (!originalUser) return;
        setUser(originalUser);
        setOriginalUser(null);
        sessionStorage.removeItem('keledon_impersonated_user');
    }, [originalUser]);

    const hasRole = useCallback((minRole: UserRole) => {
        if (!user) return false;
        return roleHierarchy.indexOf(user.role) >= roleHierarchy.indexOf(minRole);
    }, [user]);

    const setUserRole = useCallback((role: UserRole) => {
        if (!user) return;
        if (!originalUser) setOriginalUser(user);
        setUser({ ...user, role });
        sessionStorage.setItem('keledon_impersonated_user', JSON.stringify({ ...user, role }));
    }, [user, originalUser]);

    return (
        <AuthContext.Provider value={{
            user,
            originalUser,
            isAuthenticated: !!user,
            isLoading,
            isImpersonating: !!originalUser,
            isActuallySuperAdmin,
            showSimulationFeatures,
            loginWithGoogle,
            loginDemo,
            loginDev,
            signInWithEmail,
            logout,
            impersonateUser,
            stopImpersonation,
            hasRole,
            setUserRole,
            email,
            setEmail,
            password,
            setPassword,
            error,
            setError,
            setUser,
        }}>
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
