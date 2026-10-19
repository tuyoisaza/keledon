import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/lib/api-fetch';
import { diagnostic, type Diagnostic } from './meet-diagnostics';

type Destination = { vendorId: string; origin: string };
type Observation = Destination & { caseNumber: string; outcome: 'found' | 'not_found' | 'needs_assistance'; status?: string; subject?: string };
type Surface = Destination & { window: Window; session: string; teamId: string; cases: string[]; expires: number; ready: boolean; pending?: { id: string; resolve: (value: Observation) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } };
const protocol = 'keledon-crm-read-v1';
export function useSalesforceSurface(teamId: string, disabled: boolean, record: (row: Diagnostic) => void) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState('Salesforce sin enlazar. Solo casos ficticios y lectura.');
  const [number, setNumber] = useState('');
  const [allowedText, setAllowedText] = useState('');
  const [busy, setBusy] = useState(false);
  const [observation, setObservation] = useState<Observation | null>(null);
  const surface = useRef<Surface | null>(null);
  const epoch = useRef(0);
  const readGeneration = useRef(0);
  const send = (s: Surface, data: Record<string, unknown>) => { if (!s.window.closed) s.window.postMessage({ protocol, session: s.session, ...data }, s.origin); };
  const cancel = useCallback(() => {
    readGeneration.current++;
    const s = surface.current;
    if (s?.pending) { clearTimeout(s.pending.timer); s.pending.reject(new Error('Consulta cancelada')); s.pending = undefined; }
    if (s) send(s, { type: 'cancel' });
  }, []);
  useEffect(() => {
    epoch.current++;
    setDestinations([]); setSelected(''); setObservation(null); setAllowedText(''); setNumber(''); setBusy(false);
    const receive = (event: MessageEvent) => {
      const s = surface.current, d = event.data;
      if (!s || s.window.closed || event.source !== s.window || event.origin !== s.origin || !d || d.protocol !== protocol || Date.now() >= s.expires) return;
      if (d.type === 'ready') { send(s, { type: 'offer', cases: s.cases }); setStatus('Salesforce enlazado para lectura durante dos minutos'); s.ready = true; record(diagnostic('CRM', 'SURFACE_LINKED')); return; }
      if (d.session !== s.session || d.type !== 'result' || !s.pending || d.requestId !== s.pending.id) return;
      const pending = s.pending; s.pending = undefined; clearTimeout(pending.timer);
      if (!['found', 'not_found', 'needs_assistance'].includes(d.outcome) || typeof d.caseNumber !== 'string' || !/^\d{1,12}$/.test(d.caseNumber) || (d.outcome === 'found' && (typeof d.status !== 'string' || !d.status.trim() || d.status.length > 120 || /[\r\n\x00-\x1f]/.test(d.status)))) { pending.reject(new Error('Observación CRM inválida')); return; }
      const result: Observation = { vendorId: s.vendorId, origin: s.origin, caseNumber: d.caseNumber, outcome: d.outcome, ...(d.outcome === 'found' ? { status: d.status } : {}), ...(d.outcome === 'found' && typeof d.subject === 'string' && d.subject.length <= 200 && !/[\r\n\x00-\x1f]/.test(d.subject) ? { subject: d.subject } : {}) };
      record(diagnostic('CRM', 'OBSERVATION_RECEIVED', { code: d.outcome.toUpperCase() })); pending.resolve(result);
    };
    window.addEventListener('message', receive);
    return () => { epoch.current++; window.removeEventListener('message', receive); cancel(); const s = surface.current; if (s) send(s, { type: 'stop' }); surface.current = null; };
  }, [teamId, disabled, cancel, record]);
  async function api(path: string, body?: unknown) {
    const expected = epoch.current;
    const token = getAuthToken(); if (!token) throw new Error('Sesión vigente requerida');
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 10000);
    try {
      const response = await fetch(`/api/brain/meet/${encodeURIComponent(teamId)}/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: abort.signal, redirect: 'error' });
      record(diagnostic('CRM', 'AUTH_HTTP_RESPONSE', { status: response.status }));
      if (!response.ok) throw new Error(`CRM: HTTP ${response.status}; revisa sesión y destino del equipo`);
      const result = await response.json(); if (result.teamId !== teamId || epoch.current !== expected) throw new Error('El contexto CRM cambió'); return result;
    } finally { clearTimeout(timer); }
  }
  const lookup = useCallback(async (caseNumber: string, signal?: AbortSignal): Promise<Observation> => {
    const s = surface.current;
    if (disabled || !/^\d{1,12}$/.test(caseNumber) || !s?.ready || !s.cases.includes(caseNumber) || s.teamId !== teamId || s.window.closed || Date.now() >= s.expires || signal?.aborted) throw new Error('Enlaza Salesforce y declara este caso ficticio antes de consultarlo');
    cancel();
    // Revalidate persisted authority for every read, not just when the window was opened.
    const expected = epoch.current;
    const generation = readGeneration.current;
    await api('crm-scope', { vendorId: s.vendorId, origin: s.origin });
    if (surface.current !== s || epoch.current !== expected || readGeneration.current !== generation || signal?.aborted || Date.now() >= s.expires) throw new Error('La autorización de lectura cambió');
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const onAbort = () => cancel();
      const done = () => signal?.removeEventListener('abort', onAbort);
      const timer = setTimeout(() => { if (s.pending?.id === id) { send(s, { type: 'cancel' }); s.pending = undefined; done(); reject(new Error('Salesforce no confirmó la observación en 20 segundos')); } }, 20000);
      s.pending = { id, timer, resolve: value => { done(); if (value.caseNumber !== caseNumber) reject(new Error('Número de caso no coincide')); else resolve(value); }, reject: error => { done(); reject(error); } };
      signal?.addEventListener('abort', onAbort, { once: true });
      send(s, { type: 'search_case', requestId: id, caseNumber }); record(diagnostic('CRM', 'SEARCH_REQUESTED'));
    });
  }, [teamId, disabled, cancel, record]);
  const button = 'min-h-11 rounded border border-border px-3 py-2 disabled:opacity-50';
  const panel = <fieldset className="space-y-3 rounded border border-border p-3"><legend>Salesforce · solo lectura por equipo</legend>
    <p>Abre únicamente destinos CRM activos ya autorizados en Configuración. Inicia sesión en Salesforce directamente; Brain no recibe credenciales. El adaptador busca coincidencias exactas y pide ayuda si la interfaz es ambigua.</p>
    <button className={button} disabled={disabled || busy || !teamId} onClick={() => { setBusy(true); void api('crm').then(result => { setDestinations(result.destinations); setSelected(''); setStatus(result.destinations.length ? 'Selecciona el destino autorizado' : 'No hay un destino Salesforce activo autorizado para este equipo'); }, () => setStatus('No se pudo consultar la configuración CRM')).finally(() => setBusy(false)); }}>7 · Cargar destinos CRM autorizados</button>
    <label className="block">Destino autorizado<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Seleccionar</option>{destinations.map((d, i) => <option key={`${d.vendorId}:${d.origin}`} value={String(i)}>{d.origin}</option>)}</select></label>
    <label className="block">Casos ficticios permitidos · uno o dos, separados por coma<input value={allowedText} maxLength={25} onChange={e => setAllowedText(e.target.value)} /></label>
    <button className={button} disabled={disabled || busy || !selected || !allowedText} onClick={() => {
      const destination = destinations[Number(selected)]; if (!destination) return;
      const cases = [...new Set(allowedText.split(',').map(x => x.trim()))];
      if (!cases.length || cases.length > 2 || cases.some(x => !/^\d{1,12}$/.test(x))) { setStatus('Declara uno o dos números exactos de casos ficticios'); return; }
      cancel(); const prior = surface.current; if (prior) send(prior, { type: 'stop' }); surface.current = null;
      const child = window.open(`${destination.origin}/lightning/o/Case/list`, `keledon-crm-${crypto.randomUUID()}`, 'popup,width=1100,height=800');
      if (!child) { setStatus('Permite abrir la ventana Salesforce'); return; }
      setBusy(true); const expectedTeam = teamId;
      void api('crm-scope', destination).then(result => {
        if (result.teamId !== expectedTeam) { child.close(); return; }
        surface.current = { ...destination, cases, window: child, teamId: expectedTeam, session: crypto.randomUUID(), expires: Date.now() + 120000, ready: false };
        setStatus('En Salesforce pulsa «Conectar lectura con Brain». Solo dos minutos.');
      }, () => { child.close(); setStatus('Destino CRM rechazado por el servidor'); }).finally(() => setBusy(false));
    }}>8 · Abrir Salesforce y autorizar lectura</button>
    <label className="block">Número de caso ficticio<input value={number} maxLength={12} inputMode="numeric" onChange={e => setNumber(e.target.value.replace(/\D/g, ''))} /></label>
    <button className={button} disabled={disabled || busy || !number} onClick={() => { setBusy(true); setObservation(null); void lookup(number).then(result => { setObservation(result); setStatus('Observación recibida; confirma el dato durante la UAT'); }, error => setStatus(error.message)).finally(() => setBusy(false)); }}>9 · Buscar y leer caso exacto</button>
    <button className={button} onClick={() => { cancel(); const s = surface.current; if (s) send(s, { type: 'stop' }); surface.current = null; setObservation(null); setStatus('Lectura cancelada y enlace liberado'); }}>Liberar CRM</button>
    <p role="status">{status}</p>{observation && <p>Observación efímera: {observation.outcome}{observation.status ? ` · ${observation.status}` : ''}</p>}
  </fieldset>;
  return { panel, lookup, cancel };
}
