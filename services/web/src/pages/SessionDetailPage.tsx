import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';

export default function SessionDetailPage() {
    const { id } = useParams();
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <Link
                to="/sessions"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('sessionDetail.backToSessions')}
            </Link>

            <div className="rounded-xl border border-border bg-card p-6">
                <h1 className="text-2xl font-bold text-foreground mb-4">{t('sessionDetail.title')}</h1>
                <div className="p-4 bg-muted rounded-lg border border-border font-mono text-sm">
                    {t('sessionDetail.id')}: {id}
                </div>
                <section aria-label={t('sessionDetail.recordingPlaceholder')} className="mt-8 flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                    {t('sessionDetail.recordingPlaceholder')}
                </section>
            </div>
        </div>
    );
}
