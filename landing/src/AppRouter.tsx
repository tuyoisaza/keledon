import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ManagementLayout } from '@/components/management/ManagementLayout';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import LaunchKeledonPage from '@/pages/LaunchKeledonPage';
import TestBrowserPage from '@/pages/TestBrowserPage';
import DashboardPage from '@/pages/DashboardPage';
import KnowledgePage from '@/pages/KnowledgePage';
import AdminPage from '@/pages/AdminPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import SuperAdminPage from '@/pages/SuperAdminPage';
import ManagementCompaniesPage from '@/pages/ManagementCompaniesPage';
import ManagementBrandsPage from '@/pages/ManagementBrandsPage';
import ManagementTeamsPage from '@/pages/ManagementTeamsPage';
import ManagementUsersPage from '@/pages/ManagementUsersPage';
import ManagementKeledonsPage from '@/pages/ManagementKeledonsPage';
import ManagementVoiceProfilesPage from '@/pages/ManagementVoiceProfilesPage';
import ManagementProvidersPage from '@/pages/ManagementProvidersPage';
import ManagementVendorsPage from '@/pages/ManagementVendorsPage';
import ManagementDebugPage from '@/pages/ManagementDebugPage';
import ManagementStatusPage from '@/pages/ManagementStatusPage';
import FlowsPage from '@/pages/FlowsPage';
import SessionsPage from '@/pages/SessionsPage';
import SessionsLivePage from '@/pages/SessionsLivePage';
import SessionsHistoryPage from '@/pages/SessionsHistoryPage';
import SessionDetailPage from '@/pages/SessionDetailPage';
import WorkStatsPage from '@/pages/WorkStatsPage';
import KnowledgeStatsPage from '@/pages/KnowledgeStatsPage';
import ProfilePage from '@/pages/ProfilePage';
import SubagentsPage from '@/pages/SubagentsPage';
import VectorStoreDocumentsPage from '@/pages/VectorStoreDocumentsPage';
import VectorStoreAddDocumentPage from '@/pages/VectorStoreAddDocumentPage';
import VectorStoreCategoriesPage from '@/pages/VectorStoreCategoriesPage';
import DevicesPage from '@/pages/DevicesPage';

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
                <Route path="/login" element={<LoginPage />} />

                {/* Public test routes */}
                <Route
                    path="/test-browser"
                    element={<TestBrowserPage />}
                />

                {/* Protected routes with layout */}
                <Route
                    path="/launch-keledon"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <LaunchKeledonPage />
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
                    path="/profile"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <ProfilePage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/devices"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <DevicesPage />
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
                    path="/admin/users"
                    element={
                        <ProtectedRoute minRole="coordinator">
                            <AppLayout>
                                <AdminUsersPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/settings"
                    element={
                        <ProtectedRoute minRole="coordinator">
                            <AppLayout>
                                <AdminSettingsPage />
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
                {/* <Route
                    path="/subagents"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <SubagentsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                /> */}
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
                    path="/management/companies"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementCompaniesPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/brands"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementBrandsPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/teams"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementTeamsPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/users"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementUsersPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/keledons"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementKeledonsPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/flows"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <FlowsPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/voice-profiles"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementVoiceProfilesPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/providers"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementProvidersPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/vendors"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementVendorsPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/vector-store"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <VectorStoreDocumentsPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/vector-store/add-document"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <VectorStoreAddDocumentPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/vector-store/edit-document/:id"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <VectorStoreAddDocumentPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/vector-store/categories"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <VectorStoreCategoriesPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/debug"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementDebugPage />
                                </ManagementLayout>
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/management/status"
                    element={
                        <ProtectedRoute minRole="admin">
                            <AppLayout>
                                <ManagementLayout>
                                    <ManagementStatusPage />
                                </ManagementLayout>
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
                    path="/sessions/live"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <SessionsLivePage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sessions/history"
                    element={
                        <ProtectedRoute minRole="user">
                            <AppLayout>
                                <SessionsHistoryPage />
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

