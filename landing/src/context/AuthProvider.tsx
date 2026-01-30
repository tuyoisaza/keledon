/**
 * Hybrid Auth Provider for KELEDON
 * Uses Supabase for authentication + Local API for non-auth data
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { debugLogger } from '@/lib/debug-logger';
import ApiClient from '@/lib/api-client';
import type { User, AuthContextType } from './AuthContext';

export type UserRole = 'guest' | 'user' | 'agent' | 'admin' | 'coordinator' | 'superadmin';

export interface AuthContextType {
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [originalUser, setOriginalUser] = useState<User | null>(null);
    const userRef = useRef<User | null>(null);

    // Initialize API client
    const [apiClient] = useState(() => new ApiClient());

    useEffect(() => {
        userRef.current = userRef.current;
    }, [userRef.current]);

    const getRedirectPath = useCallback((role: UserRole) => {
        switch (role) {
            case 'user': return '/launch-agent';
            case 'agent':
            case 'coordinator': return '/dashboard';
            case 'admin': return '/management';
            case 'superadmin': return '/management';
            default: return '/dashboard';
        }
    }, []);

    // Supabase authentication handlers
    const loginWithGoogle = useCallback(async () => {
        debugLogger.log('Google login initiated');
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });
            
            if (error) {
                debugLogger.error('Google login failed', error);
            } else if (data.user) {
                debugLogger.log('Google login successful', data.user);
            }
        } catch (err) {
            debugLogger.error('Google login error', err);
        }
    }, [debugLogger]);

    const loginDemo = useCallback((role: UserRole) => {
        debugLogger.log(`Demo login initiated for role: ${role}`);
        const demoUser: User = {
            id: 'demo-' + role,
            email: `demo-${role}@keledon.com`,
            name: `Demo ${role}`,
            role: role,
            company_id: 'demo-company',
            team_id: 'demo-team'
        };
        
        setOriginalUser(null);
        setIsLoading(false);
        userRef.current = demoUser;
        debugLogger.log('Demo user logged in', demoUser);
    }, [debugLogger]);

    const loginDev = useCallback(async (email: string, password: string) => {
        debugLogger.log(`Dev login initiated for: ${email}`);
        setIsLoading(true);
        
        try {
            const response = await apiClient.current.login(email, password);
            
            if (response.success) {
                const user = response.user;
                setOriginalUser(user);
                setIsLoading(false);
                userRef.current = user;
                debugLogger.log('Dev login successful', user);
            } else {
                setIsLoading(false);
                debugLogger.error('Dev login failed', response.message);
            }
        } catch (error) {
            setIsLoading(false);
            debugLogger.error('Dev login error', error);
        }
    }, [apiClient, debugLogger]);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        debugLogger.log(`Email login initiated for: ${email}`);
        setIsLoading(true);
        
        try {
            const response = await apiClient.current.login(email, password);
            
            if (response.success) {
                const user = response.user;
                setOriginalUser(user);
                setIsLoading(false);
                userRef.current = user;
                debugLogger.log('Email login successful', user);
            } else {
                setIsLoading(false);
                debugLogger.error('Email login failed', response.message);
            }
        } catch (error) {
            setIsLoading(false);
            debugLogger.error('Email login error', error);
        }
    }, [apiClient, debugLogger]);

    const logout = useCallback(async () => {
        debugLogger.log('Logout initiated');
        setIsLoading(true);
        
        try {
            // Logout from Supabase
            await supabase.auth.signOut();
            
            // Logout from local backend
            await apiClient.current.logout();
            
            // Clear user state
            setOriginalUser(null);
            userRef.current = null;
            setIsLoading(false);
            debugLogger.log('Logout successful');
        } catch (error) {
            setIsLoading(false);
            debugLogger.error('Logout error', error);
        }
    }, [supabase, apiClient, debugLogger]);

    const impersonateUser = useCallback((user: User) => {
        debugLogger.log('User impersonation started', user);
        setOriginalUser(user);
        userRef.current = user;
        debugLogger.log('User impersonated', user);
    }, [debugLogger]);

    const stopImpersonation = useCallback(() => {
        debugLogger.log('Stopping impersonation');
        // Reset to original user if available, otherwise clear
        const user = originalUser;
        userRef.current = user;
        debugLogger.log('User restored', user);
    }, [originalUser, debugLogger]);

    const hasRole = useCallback((minRole: UserRole) => {
        const currentRole = userRef.current?.role || 'guest';
        const roleHierarchy = ['guest', 'user', 'agent', 'coordinator', 'admin', 'superadmin'];
        const currentIndex = roleHierarchy.indexOf(currentRole);
        const minIndex = roleHierarchy.indexOf(minRole);
        return currentIndex >= minIndex;
    }, [userRef]);

    useEffect(() => {
        const { data: { session } } = supabase.auth.onAuthStateChange((event, session) => ({ session }));
        
        if (session?.user) {
            debugLogger.log('Supabase user authenticated', session.user);
            
            // Check if user exists in database and get full user data
            try {
                // Create user object with Supabase data
                const user: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.full_name || 'User',
                    role: session.user.user_metadata?.role as UserRole || 'user',
                    company_id: session.user.user_metadata?.company_id,
                    team_id: session.user.user_metadata?.team_id,
                    avatar: session.user.user_metadata?.avatar_url
                };
                
                setOriginalUser(user);
                userRef.current = user;
                setIsLoading(false);
                debugLogger.log('User authenticated', user);
            } catch (error) {
                debugLogger.error('Error processing Supabase user', error);
                // Still set basic user info if database lookup fails
                const basicUser: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.full_name || 'User',
                    role: session.user.user_metadata?.role as UserRole || 'user'
                };
                
                setOriginalUser(basicUser);
                userRef.current = basicUser;
                setIsLoading(false);
            }
        } else {
            debugLogger.log('No authenticated user');
            setOriginalUser(null);
            userRef.current = null;
            setIsLoading(false);
        }
        
        setIsLoading(false);
    }, [setOriginalUser, userRef, setIsLoading, debugLogger]);

    const isActuallySuperAdmin = 
        (originalUser?.role === 'superadmin') ||
        (!originalUser && userRef.current?.role === 'superadmin');

    useEffect(() => {
        const showSimulationFeatures = isActuallySuperAdmin;
        
        // This could be used to show/hide admin features
        if (showSimulationFeatures) {
            debugLogger.log('Super admin features enabled');
        }
    }, [isActuallySuperAdmin, debugLogger]);

    const value: AuthContextType = {
        user: userRef.current,
        originalUser,
        isAuthenticated: !!userRef.current,
        isLoading,
        isImpersonating: !!originalUser,
        loginWithGoogle,
        loginDemo,
        loginDev,
        signInWithEmail,
        logout,
        impersonateUser,
        stopImpersonation,
        hasRole,
    };

    return (
        <AuthProvider value={value}>
            {children}
        </AuthProvider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthProvider;