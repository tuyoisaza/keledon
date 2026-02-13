import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

// Pages
import LandingPage from '@/pages/LandingPage';
import LaunchAgentPage from '@/pages/LaunchAgentPage';
import DashboardPage from '@/pages/DashboardPage';
import KnowledgePage from '@/pages/KnowledgePage';
import AdminPage from '@/pages/AdminPage';
import SuperAdminPage from '@/pages/SuperAdminPage';
import FlowsPage from '@/pages/FlowsPage';
import SessionsPage from '@/pages/SessionsPage';
import SessionDetailPage from '@/pages/SessionDetailPage';
import WorkStatsPage from '@/pages/WorkStatsPage';
import KnowledgeStatsPage from '@/pages/KnowledgeStatsPage';

interface ProtectedRouteProps {
    children: React.ReactNode;
    minRole: UserRole;
}

function ProtectedRoute({ children, minRole }: ProtectedRouteProps) {
    const { isAuthenticated, hasRole, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!hasRole(minRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Navigate to="/" replace />} />

                {/* Protected routes with layout */}
                <Route
                    path="/launch-agent"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <LaunchAgentPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <DashboardPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/knowledge"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <KnowledgePage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute minRole="coordinator">
                            <AppLayout>
                                <AdminPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/flows"
                    element={
                        <ProtectedRoute minRole="coordinator">
                            <AppLayout>
                                <FlowsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/superadmin"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <SuperAdminPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <SuperAdminPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sessions"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <SessionsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sessions/:id"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <SessionDetailPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/work-stats"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <WorkStatsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/knowledge-stats"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <KnowledgeStatsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

