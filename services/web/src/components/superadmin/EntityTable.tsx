import { Pencil, Trash2, Loader2, UserCircle } from 'lucide-react';
import React from 'react';
import type { User, UserRole } from '@/context/AuthContext';

interface EntityRow extends Record<string, unknown> {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    avatar?: string;
}

const userRoles: UserRole[] = ['guest', 'user', 'agent', 'admin', 'coordinator', 'superadmin'];

function isUserRole(role: string | undefined): role is UserRole {
    return role !== undefined && userRoles.includes(role as UserRole);
}

function renderCellValue(value: unknown): React.ReactNode {
    return typeof value === 'string' || typeof value === 'number' ? value : null;
}

interface EntityTableProps {
    loading: boolean;
    columns: { key: string; label: string; render?: (row: EntityRow) => React.ReactNode }[];
    filteredData: EntityRow[];
    activeTab: string;
    impersonateUser: (user: User) => void;
    onEdit: (row: EntityRow) => void;
    onDelete: (id: string, name: string) => void;
    isSuperAdmin?: boolean;
}

export const EntityTable: React.FC<EntityTableProps> = ({
    loading,
    columns,
    filteredData,
    activeTab,
    impersonateUser,
    onEdit,
    onDelete,
    isSuperAdmin = false
}) => {
    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border text-left text-sm text-muted-foreground">
                            {columns.map((col) => (
                                <th key={col.key} className="px-4 py-3 font-medium">{col.label}</th>
                            ))}
                            <th className="px-4 py-3 font-medium text-right">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                                    No items found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((row) => (
                                <tr key={row.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-4 py-4">
                                            {col.render ? col.render(row) : <span className="text-foreground">{renderCellValue(row[col.key])}</span>}
                                        </td>
                                    ))}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {activeTab === 'users' && isSuperAdmin && isUserRole(row.role) && row.name && row.email && (
                                                <button
                                                    onClick={() => {
                                                        if (!isUserRole(row.role)) return;
                                                        const userToImpersonate = {
                                                            id: row.id,
                                                            name: row.name ?? '',
                                                            email: row.email ?? '',
                                                            role: row.role,
                                                            avatar: row.avatar
                                                        };
                                                        impersonateUser(userToImpersonate);
                                                    }}
                                                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-colors mr-2"
                                                    title={`Simulate ${row.name || 'User'}`}
                                                >
                                                    <UserCircle className="w-3.5 h-3.5" />
                                                    Simulate
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onEdit(row)}
                                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(row.id, row.name || row.email || 'this item')}
                                                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
