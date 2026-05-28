import React from 'react';
import { Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    targetName: string;
    onCancel: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    targetName,
    onCancel,
    onConfirm,
    loading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl border border-border w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">Confirm Delete</h3>
                    <p className="text-muted-foreground">
                        Are you sure you want to delete <span className="font-semibold text-foreground">{targetName}</span>?
                        This action cannot be undone.
                    </p>
                </div>
                <div className="bg-muted/50 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};
