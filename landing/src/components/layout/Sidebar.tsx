import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Play,
    LayoutDashboard,
    Radio,
    Workflow,
    BookOpen,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Shield,
    GraduationCap,
    Monitor,
    Bot,
    User,
    Activity,
    Building2,
    LucideIcon,
    Tag,
    Users as UsersIcon,
    Copy,
    Check,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { copyDebugReport } from '@/lib/debug-report';
import { toast } from 'sonner';

interface NavItem {
    icon: React.ElementType;
    label: string;
    href: string;
    minRole: 'user' | 'agent' | 'admin' | 'coordinator' | 'superadmin';
}

const navItems: NavItem[] = [
    { icon: Play, label: 'Launch Keledon', href: '/launch-keledon', minRole: 'user' },
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', minRole: 'user' },
    { icon: Radio, label: 'Sessions', href: '/sessions/history', minRole: 'user' },
    { icon: Workflow, label: 'Flows', href: '/flows', minRole: 'coordinator' },
    // { icon: Bot, label: 'SubAgents', href: '/subagents', minRole: 'admin' },
    { icon: BookOpen, label: 'Knowledge', href: '/knowledge', minRole: 'user' },
    { icon: BarChart3, label: 'Metrics', href: '/admin/users', minRole: 'coordinator' },
    { icon: Activity, label: 'Work Stats', href: '/work-stats', minRole: 'user' },
    { icon: GraduationCap, label: 'Knowledge Stats', href: '/knowledge-stats', minRole: 'user' },
    { icon: Monitor, label: 'Devices', href: '/devices', minRole: 'user' },
    { icon: User, label: 'Profile', href: '/profile', minRole: 'user' },
    { icon: Settings, label: 'Management', href: '/management/companies', minRole: 'admin' },
];

const managementItems: NavItem[] = [];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [copied, setCopied] = useState(false);
    const location = useLocation();
    const { user, logout, hasRole } = useAuth();

    const filteredItems = navItems.filter(item => {
        const isSuperAdmin = user?.role === 'superadmin';

        // Hide standard Flows and Knowledge for Super Admin
        if (isSuperAdmin && (item.label === 'Flows' || item.label === 'Knowledge')) {
            return false;
        }

        return hasRole(item.minRole);
    });

    return (
        <aside
            className={cn(
                'h-screen flex flex-col bg-sidebar border-r border-border transition-all duration-300',
                collapsed ? 'w-16' : 'w-56'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                {!collapsed && (
                    <div className="flex flex-col items-start">
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-sm">K</span>
                            </div>
                            <span className="font-bold text-lg text-foreground">Keledon</span>
                        </Link>
                        <div className="flex items-center gap-2 ml-10 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">v0.0.89</span>
                            <button
                                onClick={async () => {
                                    const success = await copyDebugReport();
                                    if (success) {
                                        setCopied(true);
                                        toast.success('Debug report copied to clipboard!');
                                        setTimeout(() => setCopied(false), 2000);
                                    } else {
                                        toast.error('Failed to copy debug report');
                                    }
                                }}
                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy debug report"
                            >
                                {copied ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                    <Copy className="w-3 h-3" />
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    sessionStorage.clear();
                                    localStorage.clear();
                                    toast.info('Cache cleared, redirecting...');
                                    window.location.href = '/login';
                                }}
                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Flush cache and logout"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">K</span>
                        </div>
                        <button
                            onClick={async () => {
                                const success = await copyDebugReport();
                                if (success) {
                                    toast.success('Debug report copied!');
                                } else {
                                    toast.error('Failed to copy');
                                }
                            }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy debug report"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => {
                                sessionStorage.clear();
                                localStorage.clear();
                                toast.info('Cache cleared');
                                window.location.href = '/login';
                            }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Flush cache and logout"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        'p-1 rounded hover:bg-muted text-muted-foreground',
                        collapsed && 'mx-auto mt-2'
                    )}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {filteredItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.label}
                            to={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-border">
                <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
                    <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-foreground font-medium text-sm",
                        "bg-muted"
                    )}>
                        {user?.name.charAt(0).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                {user?.role}
                            </p>
                        </div>
                    )}
                    {!collapsed && (
                        <button
                            onClick={logout}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
