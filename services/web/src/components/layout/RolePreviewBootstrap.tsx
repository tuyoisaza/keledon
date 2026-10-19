import { useState } from 'react';
import { useTranslation } from '@/context/I18nContext';

export function RolePreviewBootstrap() {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem('role_operator_cleanup_session') || '');

  const start = async () => {
    // Open synchronously from the explicit user gesture; never put credentials in a URL.
    const target = window.open('', '_blank');
    if (!target) { setStatus(t('uatTestProfiles.popupBlocked')); return; }
    setPending(true);
    try {
      const response = await fetch('/api/auth/uat-test-profiles/bootstrap', {
        method: 'POST', headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` },
      });
      if (!response.ok) throw new Error('Bootstrap unavailable');
      const data = await response.json();
      if (!data.token || !data.sessionId || !data.runId || !data.operatorId || !data.otherCompanyId ||
          !Number.isFinite(data.expiresAt)) throw new Error('Invalid bootstrap');
      sessionStorage.setItem('role_operator_cleanup_session', data.sessionId);
      setSessionId(data.sessionId);
      // Same-origin popup initially inherits storage. Replace all authentication state
      // before navigating and detach opener; the real operator's session stays in this tab.
      target.sessionStorage.clear();
      target.sessionStorage.setItem('auth_token', data.token);
      target.sessionStorage.setItem('role_operator_run_id', data.runId);
      target.sessionStorage.setItem('role_operator_other_company', data.otherCompanyId);
      target.sessionStorage.setItem('role_operator_expiry_probe', data.expiryProbe);
      target.sessionStorage.setItem('role_operator_expires_at', String(data.expiresAt));
      target.opener = null;
      target.location.replace('/profile');
      setStatus(t('uatTestProfiles.bootstrapStarted'));
    } catch {
      target.close();
      setStatus(t('uatTestProfiles.prepareFailed'));
    } finally { setPending(false); }
  };

  const retire = async () => {
    setPending(true);
    try {
      const response = await fetch('/api/auth/uat-test-profiles/bootstrap/retire', {
        method: 'POST', headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) throw new Error('Retirement unavailable');
      sessionStorage.removeItem('role_operator_cleanup_session');
      setSessionId('');
      setStatus(t('uatTestProfiles.retired'));
    } catch { setStatus(t('uatTestProfiles.returnFailed')); }
    finally { setPending(false); }
  };

  return <div className="space-y-2 border-t border-border pt-2 text-xs">
    <p className="text-muted-foreground">{t('uatTestProfiles.bootstrapHelp')}</p>
    <button type="button" onClick={start} disabled={pending || !!sessionId}
      className="w-full rounded border border-input px-2 py-1.5 disabled:opacity-50">{t('uatTestProfiles.bootstrap')}</button>
    {sessionId && <button type="button" onClick={retire} disabled={pending}
      className="w-full rounded border border-input px-2 py-1.5 disabled:opacity-50">{t('uatTestProfiles.retire')}</button>}
    {status && <p role="status">{status}</p>}
  </div>;
}
