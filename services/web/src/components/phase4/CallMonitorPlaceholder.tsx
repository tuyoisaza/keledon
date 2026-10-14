import { Activity, Clock3, Mic, PhoneCall, Workflow } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';

const stateTimeline = [
    ['call_received', 'sessions.state.callReceived'],
    ['listening', 'sessions.state.listening'],
    ['transcribing', 'sessions.state.transcribing'],
    ['thinking', 'sessions.state.thinking'],
    ['action_required', 'sessions.state.actionRequired'],
    ['executing_rpa', 'sessions.state.executingRpa'],
    ['reporting', 'sessions.state.reporting'],
] as const;

export default function CallMonitorPlaceholder() {
    const { t } = useTranslation();
    return (
        <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500">
                        <PhoneCall className="h-3.5 w-3.5" />
                        {t('sessions.monitor.liveStub')}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-foreground">{t('sessions.monitor.title')}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('sessions.monitor.description')}
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Clock3 className="h-4 w-4 text-primary" />
                        {t('sessions.monitor.canonicalLoop')}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t('sessions.monitor.loopDescription')}</p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Workflow className="h-4 w-4 text-primary" />
                        {t('sessions.monitor.timeline')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {stateTimeline.map(([state, labelKey], index) => (
                            <div key={state} className="flex items-center gap-2">
                                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                                    {t(labelKey)}
                                </span>
                                {index < stateTimeline.length - 1 && <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3">
                    <div className="rounded-lg border border-border bg-background px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Mic className="h-4 w-4 text-primary" />
                            {t('sessions.monitor.transcriptPayload')}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('sessions.monitor.transcriptDescription')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <PhoneCall className="h-4 w-4 text-primary" />
                            {t('sessions.monitor.placeholderNote')}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('sessions.monitor.placeholderDescription')}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
