import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background md:flex-row">
            <Sidebar />
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
