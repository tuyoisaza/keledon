import { useRef, useState } from 'react';
import { useTranslation } from '@/context/I18nContext';

interface Profile { id: string; role: string; name: string }
interface Result { case: string; expected: string; actual: number; result: 'PASS' | 'FAIL' }

/** Explicit finite production checks against owned synthetic records only. No provider execution. */
export function RolePreviewUatPanel() {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Result[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('role_operator_uat_results') || '[]'); } catch { return []; }
  });
  const lastPreview = useRef('');
  const request = async (path: string, token: string, method = 'GET', body?: unknown) => {
    const response = await fetch(path, { method, headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  };
  const publish = (next: Result[]) => {
    setRows([...next]);
    sessionStorage.setItem('role_operator_uat_results', JSON.stringify(next));
  };
  const run = async () => {
    setPending(true); setError('');
    const next: Result[] = [];
    const check = (name: string, expected: number | number[], actual: number, valid = true) => {
      const codes = Array.isArray(expected) ? expected : [expected];
      next.push({ case: name, expected: codes.join('/'), actual, result: codes.includes(actual) && valid ? 'PASS' : 'FAIL' });
      publish(next);
      if (!codes.includes(actual) || !valid) throw new Error(name);
    };
    const operator = sessionStorage.getItem('auth_token') || '';
    let activeSession = '';
    try {
      const identity = await request('/api/auth/me', operator);
      check('operator.identity', 200, identity.status, identity.data?.user?.role === 'superadmin' && identity.data?.user?.uatRoleOperator === true);
      const list = await request('/api/auth/uat-test-profiles', operator);
      const profiles: Profile[] = list.data?.profiles || [];
      check('operator.profiles', 200, list.status, profiles.length === 4 && ['user', 'agent', 'admin', 'coordinator'].every(role => profiles.some(p => p.role === role)));
      check('operator.global-denial', 403, (await request('/api/crud/companies', operator)).status);
      check('operator.bootstrap-denial', 403, (await request('/api/auth/uat-test-profiles/bootstrap', operator, 'POST')).status);
      check('operator.unknown-target', 404, (await request('/api/auth/uat-test-profiles/switch', operator, 'POST', { profileId: '00000000-0000-4000-8000-000000000000' })).status);
      const companyB = sessionStorage.getItem('role_operator_other_company');
      if (!companyB) throw new Error('Synthetic tenant B unavailable');
      for (const profile of profiles) {
        const started = await request('/api/auth/uat-test-profiles/switch', operator, 'POST', { profileId: profile.id });
        activeSession = started.data?.sessionId || '';
        const token = started.data?.token;
        check(`${profile.role}.start`, 201, started.status, !!token && !!activeSession);
        lastPreview.current = token;
        const me = await request('/api/auth/me', token);
        check(`${profile.role}.identity`, 200, me.status, me.data?.user?.id === profile.id && me.data?.user?.role === profile.role && me.data?.user?.uatTestProfile === true);
        check(`${profile.role}.read`, 200, (await request('/api/devices', token)).status);
        check(`${profile.role}.write-denial`, 403, (await request(`/api/crud/users/${profile.id}`, token, 'PUT', { name: profile.name })).status);
        check(`${profile.role}.cross-tenant-denial`, 403, (await request(`/api/crud/companies/${encodeURIComponent(companyB)}`, token)).status);
        check(`${profile.role}.switch-denial`, 403, (await request('/api/auth/uat-test-profiles/switch', token, 'POST', { profileId: profile.id })).status);
        // Missing team is an additional guardrail: this must never call a provider even on an unexpected auth failure.
        check(`${profile.role}.tts-denial`, [401, 403], (await request('/tts/speak', token, 'POST', { text: 'Company Co synthetic authorization check' })).status);
        check(`${profile.role}.return`, 201, (await request('/api/auth/uat-test-profiles/return', operator, 'POST', { sessionId: activeSession })).status);
        check(`${profile.role}.revoked`, 401, (await request('/api/auth/me', token)).status);
        check(`${profile.role}.return-idempotent`, 201, (await request('/api/auth/uat-test-profiles/return', operator, 'POST', { sessionId: activeSession })).status);
        activeSession = '';
      }
      // Genuine server-issued short-lived probe, never a browser-generated credential.
      const probe = sessionStorage.getItem('role_operator_expiry_probe');
      if (probe) {
        await new Promise(resolve => window.setTimeout(resolve, 5200));
        check('operator.expiry', 401, (await request('/api/auth/me', probe)).status);
        sessionStorage.removeItem('role_operator_expiry_probe');
      }
      const restored = await request('/api/auth/me', operator);
      check('operator.final-return-identity', 200, restored.status, restored.data?.user?.uatRoleOperator === true);
    } catch (failure) {
      setError(`${t('uatTestProfiles.checkFailed')}: ${failure instanceof Error ? failure.message : 'request'}`);
    } finally {
      if (activeSession) await request('/api/auth/uat-test-profiles/return', operator, 'POST', { sessionId: activeSession }).catch(() => null);
      setPending(false);
    }
  };
  const verifyRetirement = async () => {
    setPending(true); setError('');
    try {
      const response = await request('/api/auth/me', sessionStorage.getItem('auth_token') || '');
      const next = [...rows, { case: 'cleanup.operator-revoked', expected: '401', actual: response.status,
        result: response.status === 401 ? 'PASS' as const : 'FAIL' as const }];
      if (lastPreview.current) {
        const preview = await request('/api/auth/me', lastPreview.current);
        next.push({ case: 'cleanup.preview-revoked', expected: '401', actual: preview.status,
          result: preview.status === 401 ? 'PASS' : 'FAIL' });
      }
      publish(next);
    } catch { setError(t('uatTestProfiles.checkFailed')); }
    finally { setPending(false); }
  };
  return <section className="mt-6 space-y-3 rounded border border-border p-4" aria-label={t('uatTestProfiles.checks')}>
    <h2 className="font-medium">{t('uatTestProfiles.operator')}</h2>
    <p className="text-sm text-muted-foreground">{t('uatTestProfiles.operatorHelp')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={run} disabled={pending} className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">{pending ? t('uatTestProfiles.working') : t('uatTestProfiles.checks')}</button>
      <button type="button" onClick={verifyRetirement} disabled={pending} className="rounded border border-input px-3 py-2 text-sm disabled:opacity-50">{t('uatTestProfiles.verifyRetirement')}</button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <pre data-testid="role-uat-results" aria-live="polite" className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(rows, null, 2)}</pre>
  </section>;
}
