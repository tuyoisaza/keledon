import { Link, useLocation } from 'react-router-dom';
import { Building2, Tag, Users as UsersIcon, UserCircle, Mic, Settings, Bug, Activity, Database, LayoutGrid, Bot, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const managementTabs = [
    { id: 'companies', label: 'Companies', href: '/management/companies', icon: Building2 },
    { id: 'brands', label: 'Brands', href: '/management/brands', icon: Tag },
    { id: 'teams', label: 'Teams', href: '/management/teams', icon: UsersIcon },
    { id: 'users', label: 'Users', href: '/management/users', icon: UserCircle },
    { id: 'keledons', label: 'KELEDONS', href: '/management/keledons', icon: Bot },
    { id: 'flows', label: 'Flows', href: '/management/flows', icon: LayoutGrid },
    { id: 'voice-profiles', label: 'Voice Profiles', href: '/management/voice-profiles', icon: Mic },
    { id: 'providers', label: 'Providers', href: '/management/providers', icon: Settings },
    { id: 'vendors', label: 'Vendors', href: '/management/vendors', icon: Store },
    { id: 'vector-store', label: 'Vector Store', href: '/management/vector-store', icon: Database },
    { id: 'debug', label: 'Debug', href: '/management/debug', icon: Bug },
    { id: 'status', label: 'Status', href: '/management/status', icon: Activity },
];

interface ManagementLayoutProps {
    children: React.ReactNode;
}

export function ManagementLayout({ children }: ManagementLayoutProps) {
    const location = useLocation();

    const isActive = (href: string) => {
        if (href === '/management/companies' && location.pathname === '/management/companies') {
            return true;
        }
        return location.pathname.startsWith(href);
    };

    return (
        <div className="space-y-6">
            <div className="border-b border-border">
                <nav className="flex flex-wrap gap-1 p-2 -mb-px">
                    {managementTabs.map((tab) => (
                        <Link
                            key={tab.id}
                            to={tab.href}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive(tab.href)
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            </div>
            <div>
                {children}
            </div>
        </div>
    );
}
