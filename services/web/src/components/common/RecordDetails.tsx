import { useId, useRef } from 'react';
import { Eye, X } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';

type DetailField = { label: string; value: string | number | null | undefined };

/** Callers provide an explicit public field allowlist, never a raw API record. */
export default function RecordDetails({ name, fields }: { name: string; fields: DetailField[] }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const { t } = useTranslation();
    return <>
        <button type="button" onClick={() => dialog.current?.showModal()}
            aria-label={`${t('records.details')}: ${name}`} title={t('records.details')}
            className="p-1.5 hover:bg-muted rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <Eye className="w-4 h-4" aria-hidden="true" />
        </button>
        <dialog ref={dialog} aria-labelledby={titleId}
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
            className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[80vh] overflow-auto rounded-xl border border-border bg-card text-foreground p-6 backdrop:bg-background/60">
            <div className="flex items-start justify-between gap-4 mb-4">
                <h2 id={titleId} className="text-lg font-semibold break-words">{name} — {t('records.details')}</h2>
                <button type="button" autoFocus onClick={() => dialog.current?.close()}
                    aria-label={t('records.close')} className="p-2 hover:bg-muted rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    <X className="w-4 h-4" aria-hidden="true" />
                </button>
            </div>
            <dl className="space-y-3">
                {fields.map(({ label, value }, index) => <div key={`${label}-${index}`}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="break-words whitespace-pre-wrap">{value === undefined || value === null || value === '' ? '—' : value}</dd>
                </div>)}
            </dl>
        </dialog>
    </>;
}
