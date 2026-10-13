import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';
import { debugLogger } from '@/lib/debug-logger';
import { debugCapture } from '@/lib/debug-report';

export function DebugOverlay() {
  const { t } = useTranslation();
  const location = useLocation();
  const [enabled, setEnabled] = useState(() => debugLogger.isEnabled());
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState(() => debugCapture.getLogs());

  useEffect(() => {
    const unsubscribeLogger = debugLogger.subscribe(() => setEnabled(debugLogger.isEnabled()));
    const unsubscribeCapture = debugCapture.subscribe(setEvents);
    return () => { unsubscribeLogger(); unsubscribeCapture(); };
  }, []);

  // The management diagnostics page already renders the same event stream and
  // endpoint results. Avoid covering its navigation and controls with the
  // floating duplicate panel.
  if (!enabled || location.pathname === '/management/debug') return null;

  const visibleEvents = events.slice(-20).reverse();
  return (
    <aside aria-label={t('diagnostics.panel')} className="fixed left-3 top-24 z-[80] w-[min(24rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-card/95 text-card-foreground shadow-lg backdrop-blur">
      <button type="button" aria-expanded={expanded} aria-controls="keledon-debug-panel"
        onClick={() => setExpanded(value => !value)}
        className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <Bug className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">{t('diagnostics.debugActive')}</span>
        <span>{events.length}</span>
        {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>
      {expanded && (
        <section id="keledon-debug-panel" aria-label={t('diagnostics.recentEvents')} className="max-h-64 overflow-auto border-t border-border px-3 py-2 text-xs">
          <h2 className="mb-2 font-semibold">{t('diagnostics.recentEvents')}</h2>
          {visibleEvents.length === 0 ? <p className="text-muted-foreground">{t('diagnostics.noEvents')}</p> : (
            <ol className="space-y-1 font-mono">
              {visibleEvents.map((event, index) => (
                <li key={`${event.timestamp}-${event.kind}-${index}`}>
                  {event.timestamp} {event.kind}/{event.level}
                  {event.method ? ` ${event.method}` : ''}
                  {event.endpoint ? ` ${event.endpoint}` : ''}
                  {event.status !== undefined ? ` ${event.status}` : ''}
                  {event.correlationId ? ` ${event.correlationId}` : ''}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </aside>
  );
}
