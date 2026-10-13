import { useEffect, useRef, useState } from 'react';
import { Clipboard, Trash2, Check } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';
import { copyDebugReport, resetApplicationState } from '@/lib/debug-report';
import './version-actions.css';

type ActionState = 'idle' | 'pending' | 'success';
export function VersionActions({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [copy, setCopy] = useState<ActionState>('idle');
  const [clear, setClear] = useState<ActionState>('idle');
  const [status, setStatus] = useState('');
  const mounted = useRef(true);
  const busy = useRef({ copy: false, clear: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; timers.current.forEach(clearTimeout); };
  }, []);
  const later = (callback: () => void) => {
    timers.current.push(setTimeout(() => { if (mounted.current) callback(); }, 1500));
  };
  const handleCopy = async () => {
    if (busy.current.copy) return;
    busy.current.copy = true;
    setStatus('');
    setCopy('pending');
    const success = await copyDebugReport();
    if (!mounted.current) return;
    setCopy(success ? 'success' : 'idle');
    setStatus(t(success ? 'diagnostics.copied' : 'diagnostics.copyFailed'));
    if (success) later(() => { setCopy('idle'); busy.current.copy = false; });
    else busy.current.copy = false;
  };
  const handleClear = async () => {
    if (busy.current.clear) return;
    busy.current.clear = true;
    setStatus('');
    setClear('pending');
    try {
      const result = await resetApplicationState();
      if (!mounted.current) return;
      setClear('success');
      setStatus(t('diagnostics.cleared'));
      later(() => {
        setClear('idle');
        busy.current.clear = false;
        // Wait until the real success indication is perceivable before local logout/navigation.
        if (result.hadSession) window.location.assign('/login');
      });
    } catch {
      if (!mounted.current) return;
      setClear('idle');
      busy.current.clear = false;
      setStatus(t('diagnostics.clearFailed'));
    }
  };
  const version = /^\d+\.\d+\.\d+$/.test(__APP_VERSION__) ? 'v' + __APP_VERSION__ : 'v0.0.0';
  return (
    <div className={'keledon-version-actions ' + className} data-testid="version-actions">
      <span className="keledon-version">{version}</span>
      <button type="button" aria-label={t('diagnostics.copy')} title={t('diagnostics.copy')}
        disabled={copy !== 'idle'} onClick={handleCopy} data-action="copy">
        {copy === 'success' ? <Check className="keledon-action-success" aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
      </button>
      <button type="button" aria-label={t('diagnostics.clear')} title={t('diagnostics.clear')}
        disabled={clear !== 'idle'} onClick={handleClear} data-action="clear">
        {clear === 'success' ? <Check className="keledon-action-success" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
      </button>
      <span className="keledon-action-status" role="status" aria-live="polite" aria-atomic="true">{status}</span>
    </div>
  );
}
