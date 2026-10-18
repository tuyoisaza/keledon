import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/context/I18nContext';
import { apiJson } from '@/lib/api-fetch';

interface FixtureRun {
  runId: string;
  expiresAt: string;
  status: 'active' | 'retired' | 'expired';
  members: Array<{ userId: string; companyId: string; teamId: string; deviceId: string }>;
}

export function UatFixturesPanel() {
  const { t } = useTranslation();
  const [runId, setRunId] = useState(() => `phdk-uat-${crypto.randomUUID()}`);
  const [userA, setUserA] = useState('');
  const [userB, setUserB] = useState('');
  const [ttl, setTtl] = useState('1');
  const [confirmed, setConfirmed] = useState(false);
  const [run, setRun] = useState<FixtureRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function execute(action: 'create' | 'read' | 'retire' | 'restore') {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const controller = new AbortController();
    request.current = controller;
    const path = '/api/admin/uat-fixtures';
    try {
      const value = await apiJson<FixtureRun>(action === 'create' ? path :
        `${path}/${encodeURIComponent(runId.trim())}${action === 'read' ? '' : `/${action}`}`, {
        method: action === 'read' ? 'GET' : 'POST', signal: controller.signal,
        ...(action === 'create' ? { body: JSON.stringify({ runId: runId.trim(), userIds: [userA.trim(), userB.trim()], ttlHours: Number(ttl) }) } : {}),
      });
      if (!controller.signal.aborted) setRun(value);
    } catch {
      if (!controller.signal.aborted) { setFailed(true); setRun(null); }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const fieldClass = 'mt-1 min-h-11 w-full rounded border border-border bg-background px-3 text-foreground';
  const buttonClass = 'min-h-11 rounded border border-border px-4 py-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary';
  return <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="uat-fixtures-title">
    <h2 id="uat-fixtures-title" className="font-semibold">{t('uatFixtures.title')}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{t('uatFixtures.description')}</p>
    <fieldset disabled={busy} className="mt-4 space-y-4">
      <label className="block text-sm">{t('uatFixtures.runId')}<input className={fieldClass} value={runId} onChange={e => { setRunId(e.target.value); setRun(null); }} autoComplete="off" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">{t('uatFixtures.userA')}<input className={fieldClass} value={userA} onChange={e => setUserA(e.target.value)} autoComplete="off" /></label>
        <label className="block text-sm">{t('uatFixtures.userB')}<input className={fieldClass} value={userB} onChange={e => setUserB(e.target.value)} autoComplete="off" /></label>
      </div>
      <label className="block text-sm">{t('uatFixtures.ttl')}<select className={fieldClass} value={ttl} onChange={e => setTtl(e.target.value)}>{[1, 2, 4, 8, 24].map(hours => <option key={hours} value={hours}>{hours} h</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{t('uatFixtures.confirm')}</label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass} disabled={!confirmed || !userA.trim() || !userB.trim() || userA.trim() === userB.trim() || !runId.trim()} onClick={() => void execute('create')}>{t('uatFixtures.create')}</button>
        <button type="button" className={buttonClass} disabled={!runId.trim()} onClick={() => void execute('read')}>{t('uatFixtures.read')}</button>
        <button type="button" className={buttonClass} disabled={!run || run.status === 'retired'} onClick={() => void execute('retire')}>{t('uatFixtures.retire')}</button>
        <button type="button" className={buttonClass} disabled={!run || run.status !== 'retired' || Date.parse(run.expiresAt) <= Date.now()} onClick={() => void execute('restore')}>{t('uatFixtures.restore')}</button>
      </div>
    </fieldset>
    <div role="status" aria-live="polite" className="mt-4 text-sm">
      {busy && t('uatFixtures.busy')}
      {failed && t('uatFixtures.failed')}
      {!busy && run && <dl className="space-y-1 break-words"><dt>{t('uatFixtures.runId')}</dt><dd>{run.runId}</dd><dt>{t('uatFixtures.status')}</dt><dd>{t(`uatFixtures.${run.status}`)}</dd><dt>{t('uatFixtures.expires')}</dt><dd>{new Date(run.expiresAt).toLocaleString()}</dd></dl>}
    </div>
  </section>;
}
