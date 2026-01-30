import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useAuth, type UserRole } from '@/context/AuthContext';
import { Bot, ArrowLeft, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const demoRoles: { role: UserRole; label: string; description: string }[] = [
    { role: 'user', label: 'User', description: 'Launch agent sessions' },
    { role: 'agent', label: 'Agent', description: 'View sessions and manage calls' },
    { role: 'coordinator', label: 'Coordinator', description: 'View team performance metrics' },
    { role: 'admin', label: 'Admin', description: 'Manage companies and brands' },
    { role: 'superadmin', label: 'Super Admin', description: 'Full system configuration' },
];

export default function LoginPage() {
    const { loginWithGoogle, loginDemo, signInWithEmail, setUser, isLoading, isAuthenticated, user, email, setEmail, password, setPassword, error, setError } = useAuth();
    const navigate = useNavigate();
    const [showDemoOptions, setShowDemoOptions] = useState(false);
    const [loginMode, setLoginMode] = useState<'google' | 'email' | 'register'>('google');
    
    // Registration state
    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerCompany, setRegisterCompany] = useState('');
    const [registerBrand, setRegisterBrand] = useState('');
    const [registerError, setRegisterError] = useState<string | null>(null);

    // Handle email login form submission
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmail(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterError(null);
        
        try {
            // Create admin user with company and brand
            const newAdminUser = {
                id: 'admin-' + Date.now(),
                name: registerName,
                email: registerEmail,
                role: 'admin' as const,
                company_id: 'company-' + Date.now(),
                team_id: 'team-' + Date.now(),
            };

            // Store company and brand info for future backend integration
            console.log('Creating admin user:', newAdminUser);
            console.log('Creating company:', registerCompany);
            console.log('Creating brand:', registerBrand);

            // Set error state to null (clear any previous errors)
            setError(null);

            // Log in as the new admin
            setUser(newAdminUser);
            sessionStorage.setItem('keledon_user', JSON.stringify(newAdminUser));
            sessionStorage.setItem('keledon_created_company', registerCompany);
            sessionStorage.setItem('keledon_created_brand', registerBrand);
            
            // Navigate to management dashboard
            navigate('/management');
        } catch (err: any) {
            setRegisterError(err.message || 'Registration failed');
        }
    };

    // Check if debug mode is enabled (from SuperAdmin settings)
    const isDebugMode = localStorage.getItem('keldon-debug-mode') === 'true';

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            const redirectPath = getRedirectPath(user.role);
            navigate(redirectPath);
        }
    }, [isAuthenticated, isLoading, navigate, user]);

    function getRedirectPath(role: UserRole) {
        switch (role) {
            case 'user': return '/launch-agent';
            case 'agent':
            case 'coordinator':
                return '/dashboard';
            case 'admin':
            case 'superadmin':
                return '/management';
            default: return '/dashboard';
        }
    }

    const handleDemoLogin = (role: UserRole) => {
        loginDemo(role);
        if (role === 'user' || role === 'agent') {
            navigate('/launch-agent');
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[80px]" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Back to landing */}
                <Link
                    to="/"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to home
                </Link>

                {/* Login Card */}
                <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                            <Bot className="w-7 h-7 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-2xl text-foreground">Keledon</span>
                    </div>

                    <h1 className="text-xl font-semibold text-foreground text-center mb-2">
                        {loginMode === 'register' ? 'Create Admin Account' : 'Welcome back'}
                    </h1>
                    <p className="text-muted-foreground text-center mb-8">
                        {loginMode === 'register' ? 'Set up your organization' : 'Sign in to access your dashboard'}
                    </p>

                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}
                    
                    {registerError && (
                        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {registerError}
                        </div>
                    )}

                    {loginMode === 'google' && (
                        <div className="space-y-4">
                            {/* Google Sign In */}
                            <div className="flex justify-center mb-2">
                                <button
                                    onClick={() => loginWithGoogle()}
                                    className="flex items-center justify-center gap-3 w-full h-[44px] rounded-full border border-border bg-white text-black font-medium hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                    Sign in with Google
                                </button>
                            </div>

                            <button
                                onClick={() => setLoginMode('email')}
                                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Or sign in with email/password
                            </button>
                            <button
                                onClick={() => setLoginMode('register')}
                                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Or create new admin account
                            </button>
                        </div>
                    )}
                    
                    {loginMode === 'email' && (
                        <form onSubmit={handleEmailLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="•••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isLoading ? 'Signing in...' : 'Sign In'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoginMode('google')}
                                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                            >
                                Back to social login
                            </button>
                        </form>
                    )}
                    
                    {loginMode === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={registerName}
                                    onChange={(e) => setRegisterName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="Enter your full name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={registerEmail}
                                    onChange={(e) => setRegisterEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={registerPassword}
                                    onChange={(e) => setRegisterPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="Create a password"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    value={registerCompany}
                                    onChange={(e) => setRegisterCompany(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="Enter your company name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Brand Name</label>
                                <input
                                    type="text"
                                    required
                                    value={registerBrand}
                                    onChange={(e) => setRegisterBrand(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="Enter your brand name"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isLoading ? 'Creating Account...' : 'Create Admin Account'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoginMode('google')}
                                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Back to login options
                            </button>
                        </form>
                    )}

                    {/* Development Login - Always visible in local development */}
                    {(import.meta.env.DEV) && (
                        <>
                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-sm text-muted-foreground">development</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            <div className="text-sm text-muted-foreground text-center mb-3">
                                Super Admin: superadmin@keledon.com / 123123
                            </div>
                        </>
                    )}

                    {/* New Admin Registration */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-sm text-muted-foreground">new to keledon?</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    <button
                        onClick={() => setLoginMode('register')}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold hover:from-primary/90 hover:to-primary/80 transition-all shadow-lg"
                    >
Create Your Admin Account
                    </button>

                    {/* Demo Login Options - Only visible when Debug Mode is enabled */}
                    {isDebugMode && (
                        <>
                            {!showDemoOptions ? (
                                <button
                                    onClick={() => setShowDemoOptions(true)}
                                    className="w-full py-3 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors border border-border"
                                >
                                    Continue with Demo Account
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground text-center mb-4">
                                        Select a demo role to explore:
                                    </p>
                                    {demoRoles.map((demo) => (
                                        <button
                                            key={demo.role}
                                            onClick={() => handleDemoLogin(demo.role)}
                                            disabled={isLoading}
                                            className={cn(
                                                'w-full p-4 rounded-lg border border-border bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-left group',
                                                isLoading && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Shield className="w-5 h-5 text-primary" />
                                                <div>
                                                    <p className="font-medium text-foreground">{demo.label}</p>
                                                    <p className="text-sm text-muted-foreground">{demo.description}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setShowDemoOptions(false)}
                                        className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Hide Demo Options
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-muted-foreground mt-8">
                    By signing in, you agree to our{' '}
                    <a href="#" className="text-primary hover:underline">Terms</a>
                    {' '}and{' '}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </p>
            </div>
        </div>
    );
}