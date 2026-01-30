import React from 'react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    targetName: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    targetName,
    onCancel,
    onConfirm
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
                        className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};
