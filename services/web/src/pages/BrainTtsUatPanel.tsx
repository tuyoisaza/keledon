import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { TtsAudioPreview } from './TtsAudioPreview';

type Run = {
  runId: string; selectedTeamId: string; expiresAt: number; expiryProbe: string;
  members: Array<{ id: string; role: string; companyId: string | null; teamId: string | null }>;
  sessions: Array<{ userId: string; role: string; teamId: string | null; token: string }>;
};
type Evidence = { case: string; status: number; expected: number; pass: boolean; team?: string; bytes?: number; contentType?: string; sha256?: string };
const SAMPLE = 'Hola, esta es una prueba de voz de Brain en español. ¿Puedes confirmar que me escuchas con claridad?';

/** Keeps synthetic capabilities in component memory; never replaces the operator session. */
export function BrainTtsUatPanel({ teamId }: { teamId: string }) {
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [audio, setAudio] = useState('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [mime, setMime] = useState('audio/wav');
  const [retired, setRetired] = useState(false);
  const runId = useRef(sessionStorage.getItem('brain_tts_synthetic_run_id') || `brain-tts-${crypto.randomUUID()}`);
  const audioUrl = useRef('');
  useEffect(() => () => { if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); }, []);

  async function admin(path: string, body?: unknown) {
    const response = await apiFetch(`/api/admin/uat-fixtures/tts-bootstrap${path}`, {
      method: 'POST', body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(`HTTP ${response.status}: ${result?.message || 'No se pudo completar la operación auditada'}`);
    }
    return response.json();
  }
  async function execute(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Error de UAT'); }
    finally { setBusy(false); }
  }
  async function prepare() {
    sessionStorage.setItem('brain_tts_synthetic_run_id', runId.current); // non-secret recovery identifier only
    const value: Run = await admin('', { runId: runId.current, teamId });
    if (run && value.members.map(m => m.id).join() !== run.members.map(m => m.id).join())
      throw new Error('El bootstrap no conservó las identidades del run');
    if (run) setEvidence(previous => [...previous, { case: 'bootstrap-idempotent', status: 201, expected: 201, pass: true }]);
    setRun(value);
  }
  async function requestSpeech(label: string, expected: number, token?: string, selectedTeam?: unknown, text = SAMPLE) {
    const response = await fetch("/tts/speak", {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text, ...(selectedTeam !== undefined ? { teamId: selectedTeam } : {}) }),
      signal: AbortSignal.timeout(35000),
    });
    const entry: Evidence = { case: label, status: response.status, expected, pass: response.status === expected };
    if (response.ok) {
      const type = response.headers.get('content-type') || '';
      const blob = await response.blob();
      entry.bytes = blob.size;
      entry.contentType = type;
      entry.sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(byte => byte.toString(16).padStart(2, '0')).join('');
      entry.team = response.headers.get('X-Keledon-TTS-Team') || '';
      entry.pass = entry.pass && type.startsWith('audio/') && blob.size > 200 && entry.team === run?.selectedTeamId;
      if (entry.pass) {
        if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
        audioUrl.current = URL.createObjectURL(blob); setAudio(audioUrl.current); setMime(type); setPreviewBlob(blob);
      }
    }
    setEvidence(previous => [...previous, entry]);
    if (!entry.pass) throw new Error(`${label}: HTTP ${response.status}; esperado ${expected}`);
  }
  async function denials() {
    if (!run) return;
    const adminSession = run.sessions.find(session => session.role === 'superadmin')!;
    const userSession = run.sessions.find(session => session.role === 'user')!;
    const other = run.sessions.filter(session => session.role === 'user')[1];
    await requestSpeech('auth-absent', 401, undefined, run.selectedTeamId);
    await requestSpeech('team-required', 400, adminSession.token);
    await requestSpeech('team-invalid', 400, adminSession.token, { invalid: true });
    await requestSpeech('team-missing', 404, adminSession.token, '00000000-0000-4000-8000-000000000000');
    await requestSpeech('normal-user-foreign-team', 403, userSession.token, other.teamId);
    await requestSpeech('synthetic-admin-unapproved-team', 403, adminSession.token, other.teamId);
    const global = await fetch('/api/crud/users', { headers: { Authorization: `Bearer ${adminSession.token}` }, signal: AbortSignal.timeout(10000) });
    setEvidence(previous => [...previous, { case: 'synthetic-admin-global-denied', status: global.status, expected: 401, pass: global.status === 401 }]);
    if (global.status !== 401) throw new Error('La sesión sintética obtuvo acceso fuera de TTS');
    // The signed probe expires after five seconds; this wait exercises actual server expiry.
    await new Promise(resolve => setTimeout(resolve, 5500));
    await requestSpeech('auth-expired', 401, run.expiryProbe, run.selectedTeamId);
  }
  async function retire() {
    await admin(`/${encodeURIComponent(run?.runId || runId.current)}/retire`);
    setRetired(true);
    sessionStorage.removeItem('brain_tts_synthetic_run_id');
    if (run) await requestSpeech('retired-session-denied', 401, run.sessions[0].token, run.selectedTeamId);
    setRun(null);
  }
  const button = 'min-h-11 rounded border border-border px-4 py-2 disabled:opacity-50';
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-label="UAT sintética de TTS">
    <h2 className="font-semibold">UAT sintética de TTS · {__APP_VERSION__}</h2>
    <p className="text-sm text-muted-foreground">Tres cuentas ficticias nuevas, dos empresas aisladas, 15 minutos de vigencia. La sesión del operador no cambia. Solo la muestra usa el proveedor del equipo seleccionado; nunca se muestran credenciales.</p>
    <div className="flex flex-wrap gap-3">
      <button className={button} disabled={busy || !teamId || retired || Boolean(run && run.selectedTeamId !== teamId)} onClick={() => void execute(prepare)}>{run ? 'Verificar idempotencia' : 'Preparar cuentas sintéticas'}</button>
      <button className={button} disabled={busy || !run || retired} onClick={() => void execute(denials)}>Verificar denegaciones</button>
      <button className={button} disabled={busy || !run || retired || !evidence.some(entry => entry.case === 'auth-expired' && entry.pass) || Boolean(audio)} onClick={() => void execute(async () => {
        if (!run) return;
        await requestSpeech('spanish-audio', 201, run.sessions.find(session => session.role === 'superadmin')!.token, run.selectedTeamId);
      })}>Generar muestra española</button>
      <button className={button} disabled={busy || retired || (!run && !sessionStorage.getItem('brain_tts_synthetic_run_id'))} onClick={() => void execute(retire)}>Retirar cuentas sintéticas</button>
    </div>
    {run && <p className="text-sm">Run: {run.runId} · Caduca: {new Date(run.expiresAt).toISOString()} · Superadmin sin empresa/equipo: {String(run.members[0]?.companyId === null && run.members[0]?.teamId === null)}</p>}
    <TtsAudioPreview audio={previewBlob} />
    {audio && <div className="space-y-2"><a className="underline" href={audio} download={`brain-tts-es-${__APP_VERSION__}.${mime.includes('wav') ? 'wav' : 'mp3'}`}>Descargar muestra española para Meet</a><p className="text-sm">La reproducción local no confirma recepción en Meet. Se requiere confirmación del interlocutor remoto.</p></div>}
    {retired && <p role="status">Cuentas sintéticas retiradas. Conservadas solo para auditoría; sesiones revocadas.</p>}
    {busy && <p role="status">Ejecutando operación limitada…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs" aria-label="Resultados UAT sin credenciales">{JSON.stringify({ version: __APP_VERSION__, cases: evidence }, null, 2)}</pre>
  </section>;
}
