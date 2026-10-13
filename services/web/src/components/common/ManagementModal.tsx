import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Native modal top layer supplies keyboard containment; cleanup restores the trigger. */
export default function ManagementModal({ title, onClose, children }: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    useEffect(() => {
        const trigger = document.activeElement;
        const element = dialog.current;
        element?.showModal();
        return () => {
            if (element?.open) element.close();
            if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
        };
    }, []);
    return <dialog ref={dialog} aria-labelledby={titleId}
            onKeyDown={event => {
                if (event.key !== 'Tab') return;
                const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'));
                const first = controls[0], last = controls[controls.length - 1];
                if (!first) { event.preventDefault(); return; }
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault(); last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault(); first.focus();
                }
            }}
        onCancel={event => { event.preventDefault(); onClose(); }}
        className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-auto border-0 bg-transparent p-0 text-foreground backdrop:bg-background/60">
        <h2 id={titleId} className="sr-only">{title}</h2>
        {children}
    </dialog>;
}
