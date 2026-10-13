import { useEffect, useRef, useState } from 'react';
import { Clipboard, Trash2, Check } from 'lucide-react';
import { useTranslation } from '@/context/useTranslation';
import { useAuth } from '@/context/useAuth';
import { useLocation } from 'react-router-dom';
import { copyDebugReport, resetApplicationState } from '@/lib/debug-report';
import { recordRoute } from '@/lib/debug-report';
import './version-actions.css';

type ActionState = 'idle' | 'pending' | 'success';
type VersionActionsProps = {
  className?: string;
  copyReport?: typeof copyDebugReport;
  resetState?: typeof resetApplicationState;
  navigateToLogin?: () => void;
};
export function VersionActions({
  className = '',
  copyReport = copyDebugReport,
  resetState = resetApplicationState,
  navigateToLogin = () => window.location.assign('/login'),
}: VersionActionsProps = {}) {
  const { t } = useTranslation();
  const { user, isAuthenticated, clearLocalSession } = useAuth();
  const { pathname } = useLocation();
  const [copy, setCopy] = useState<ActionState>('idle');
  const [clear, setClear] = useState<ActionState>('idle');
  const [copyStatus, setCopyStatus] = useState('');
  const [clearStatus, setClearStatus] = useState('');
  const mounted = useRef(true);
  const busy = useRef({ copy: false, clear: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    mounted.current = true;
    const pendingTimers = timers.current;
    return () => { mounted.current = false; pendingTimers.forEach(clearTimeout); };
  }, []);
  useEffect(() => { recordRoute(pathname); }, [pathname]);
  const later = (callback: () => void) => {
    timers.current.push(setTimeout(() => { if (mounted.current) callback(); }, 1500));
  };
  const handleCopy = async () => {
    if (busy.current.copy) return;
    busy.current.copy = true;
    setCopyStatus('');
    setCopy('pending');
    const success = await copyReport({ user, isAuthenticated, pathname });
    if (!mounted.current) return;
    setCopy(success ? 'success' : 'idle');
    setCopyStatus(t(success ? 'diagnostics.copied' : 'diagnostics.copyFailed'));
    if (success) later(() => { setCopy('idle'); busy.current.copy = false; });
    else busy.current.copy = false;
  };
  const handleClear = async () => {
    if (busy.current.clear) return;
    busy.current.clear = true;
    setClearStatus('');
    setClear('pending');
    try {
      const result = await resetState();
      if (!mounted.current) return;
      clearLocalSession();
      setClear('success');
      setClearStatus(t('diagnostics.cleared'));
      later(() => {
        setClear('idle');
        busy.current.clear = false;
        // Wait until the real success indication is perceivable before local logout/navigation.
        if (result.hadSession) navigateToLogin();
      });
    } catch {
      if (!mounted.current) return;
      clearLocalSession();
      setClear('idle');
      busy.current.clear = false;
      setClearStatus(t('diagnostics.clearFailed'));
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
      <span className="keledon-action-status" data-action-status="copy" role="status" aria-live="polite" aria-atomic="true">{copyStatus}</span>
      <span className="keledon-action-status" data-action-status="clear" role="status" aria-live="polite" aria-atomic="true">{clearStatus}</span>
    </div>
  );
}
