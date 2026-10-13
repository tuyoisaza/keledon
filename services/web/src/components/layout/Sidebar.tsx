import { ThemeControls } from '@/components/common/ThemeControls';
import { useTranslation } from '@/context/I18nContext';
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
    User,
    Activity,
    Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { VersionActions } from '@/components/common/VersionActions';

interface NavItem {
    icon: React.ElementType;
    label: string;
    href: string;
    i18nKey?: string;
    minRole: 'user' | 'agent' | 'admin' | 'coordinator' | 'superadmin';
}

const navItems: NavItem[] = [
    { icon: BookOpen, label: 'Prompts', i18nKey: 'aiAdmin.prompts', href: '/admin/prompts', minRole: 'superadmin' },
    { icon: Activity, label: 'AI consumption', i18nKey: 'aiAdmin.consumption', href: '/admin/ai-consumption', minRole: 'superadmin' },
    { icon: Play, label: 'Launch Keledon', href: '/launch-keledon', minRole: 'user' },
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', minRole: 'user' },
    { icon: Brain, label: 'Brain', href: '/brain', minRole: 'user' },
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

export function Sidebar() {
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(false);
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
                collapsed ? 'w-36' : 'w-56'
            )}
        >
            {/* Shared diagnostics stay visible in both navigation modes. */}
            <div className="flex flex-col items-start gap-1 p-3 border-b border-border">
                <div className="flex w-full items-center justify-between gap-2">
                    <Link to="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">K</span>
                        </div>
                        {!collapsed && <span className="font-bold text-lg text-foreground">Keledon</span>}
                    </Link>
                    <button type="button" onClick={() => setCollapsed(!collapsed)}
                        aria-label={t(collapsed ? 'diagnostics.expand' : 'diagnostics.collapse')}
                        className="p-1 rounded hover:bg-muted text-muted-foreground focus-visible:outline-2">
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
                <VersionActions />
                <ThemeControls />
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
                            {!collapsed && <span className="text-sm font-medium">{item.i18nKey ? t(item.i18nKey) : item.label}</span>}
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
