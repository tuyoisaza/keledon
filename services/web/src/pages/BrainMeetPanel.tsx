import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/lib/api-fetch';
import { BrainLayerControls } from './BrainLayerControls';
import { diagnostic, type Diagnostic } from './meet-diagnostics';
import { useSalesforceSurface } from './useSalesforceSurface';

const MEET_ORIGIN = 'https://meet.google.com';
const PROTOCOL = 'keledon-meet-v1';
type Turn = { role: 'user' | 'assistant'; content: string };
type Link = { window: Window; session: string; teamId: string; mode?: 'conversation' | 'stt'; generation: number; active: boolean; pending: boolean; playing: boolean; closing?: boolean; turns: number; expires: number; abort?: AbortController; timer?: ReturnType<typeof setTimeout>; history: Turn[] };

/** Opt-in audio bridge. Credentials stay here; Meet can supply only bounded audio/cancel events. */
export function BrainMeetPanel({ teamId, disabled }: { teamId: string; disabled: boolean }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Sin enlace de Meet');
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(false);
  const [evidence, setEvidence] = useState({ turns: 0, cancelled: 0, discarded: 0, delivered: 0 });
  const [lastTurn, setLastTurn] = useState({ transcript: '', reply: '' });
  const [logs, setLogs] = useState<Diagnostic[]>([]);
  const [copyStatus, setCopyStatus] = useState('');
  const [layerBusy, setLayerBusy] = useState(false);
  const record = useCallback((row: Diagnostic) => setLogs(rows => [...rows.slice(-299), row]), []);
  const crm = useSalesforceSurface(teamId, disabled, record);
  const link = useRef<Link | null>(null);
  const send = (s: Link, data: Record<string, unknown>) => {
    if (!s.window.closed) s.window.postMessage({ protocol: PROTOCOL, session: s.session, ...data }, MEET_ORIGIN);
  };
  function stop(message = 'Conversación detenida; audio liberado') {
    const s = link.current;
    if (s) {
      s.active = false; s.abort?.abort(); clearTimeout(s.timer);
      send(s, { type: 'stop' });
    }
    setActive(false); setStatus(message);
    crm.cancel();
    record(diagnostic('LIFECYCLE', 'STOPPED'));
  }
  useEffect(() => {
    setConnected(false); setActive(false);
    const onPageHide = () => stop();
    window.addEventListener('pagehide', onPageHide);
    const onMessage = (event: MessageEvent) => {
      const s = link.current;
      const d = event.data;
      if (!s || s.window.closed || event.source !== s.window || event.origin !== MEET_ORIGIN || !d || d.protocol !== PROTOCOL) return;
      if (d.type === 'ready') {
        send(s, { type: 'offer' }); setConnected(true); setStatus('Meet enlazado; confirma el inicio para el equipo seleccionado'); return;
      }
      if (d.session !== s.session) return;
      if (d.type === 'diagnostics' && d.state && typeof d.state === 'object') {
        record(diagnostic('MEET', 'TRANSPORT_SNAPSHOT', { generation: d.state.generation, bytes: d.state.sentBytes }));
        record(diagnostic('MEET', 'RECEIVED_BYTES', { bytes: d.state.receivedBytes }));
        record(diagnostic('MEET', 'SENT_PACKETS', { count: d.state.sentPackets }));
        record(diagnostic('MEET', 'RECEIVED_PACKETS', { count: d.state.receivedPackets }));
        record(diagnostic('MEET', 'REMOTE_LEVEL_MILLI', { count: d.state.remoteLevelMilli }));
        record(diagnostic('MEET', 'QUEUED_AUDIO', { elapsedMs: d.state.queuedMs }));
        if (['running', 'suspended', 'closed', 'absent'].includes(d.state.audioContext)) record(diagnostic('MEET', `CONTEXT_${d.state.audioContext.toUpperCase()}`));
        for (const key of ['remoteTracks', 'outgoingTracks', 'activeSources', 'outputBindings'] as const) {
          if (Number.isSafeInteger(d.state[key]) && d.state[key] >= 0) record(diagnostic('MEET', key.replace(/[A-Z]/g, x => `_${x}`).toUpperCase(), { count: d.state[key] }));
        }
        return;
      }
      if (d.type === 'closed') { stop('Meet liberó el enlace'); setConnected(false); return; }
      if (!s.active || Date.now() >= s.expires) return;
      if (d.type === 'interrupt' && Number.isSafeInteger(d.generation) && d.generation > s.generation) {
        const cancelled = s.pending || s.playing;
        const preparing = s.generation === 0;
        if (cancelled) setEvidence(v => ({ ...v, cancelled: v.cancelled + 1 }));
        s.generation = d.generation; s.abort?.abort();
        s.closing = false; crm.cancel();
        record(diagnostic('MEET', cancelled ? 'RESPONSE_INTERRUPTED' : 'INPUT_GENERATION', { generation: s.generation }));
        s.playing = false; setStatus(cancelled ? 'Voz remota detectada; respuesta anterior cancelada' : preparing ? 'Canal remoto preparado; esperando voz' : 'Voz remota detectada; escuchando el turno'); return;
      }
      if (d.type === 'started' && d.generation === s.generation) { s.playing = true; record(diagnostic('MEET', 'PLAYBACK_STARTED', { generation: s.generation })); return; }
      if (d.type === 'played' && d.generation === s.generation) {
        s.playing = false;
        record(diagnostic('MEET', 'PLAYBACK_ENDED', { generation: s.generation }));
        setEvidence(v => ({ ...v, delivered: v.delivered + 1 }));
        if (s.closing) stop('Conversación cerrada; audio liberado y en espera');
        else setStatus('Respuesta enviada a Meet; esperando voz remota');
        return;
      }
      if (d.type === 'error') { stop('Meet no pudo reproducir/capturar el audio'); return; }
      if (d.type !== 'turn' || d.generation !== s.generation || !(d.audio instanceof ArrayBuffer) || d.audio.byteLength < 3244 || d.audio.byteLength > 384044) return;
      if (++s.turns > 6) { stop('Límite de seis turnos alcanzado'); return; }
      const generation = s.generation;
      record(diagnostic('STT', 'REMOTE_SEGMENT', { bytes: d.audio.byteLength, generation }));
      s.pending = true;
      s.abort?.abort();
      const abort = new AbortController(); s.abort = abort;
      const timeout = setTimeout(() => abort.abort(), 90000);
      const current = () => link.current === s && s.active && generation === s.generation && !abort.signal.aborted && Date.now() < s.expires;
      const request = async (path: string, options: RequestInit) => {
        const layer = path === '/tts/speak' ? 'TTS' : path.endsWith('/stt') ? 'STT' : path.endsWith('/case-answer') ? 'CRM' : 'BRAIN';
        const started = performance.now(); record(diagnostic(layer, 'REQUEST_STARTED', { generation }));
        const token = getAuthToken();
        if (!token) throw new Error('Sesión ausente; inicia sesión de nuevo');
        const headers = new Headers(options.headers); headers.set('Authorization', `Bearer ${token}`);
        const response = await fetch(path, { ...options, headers, signal: abort.signal, redirect: 'error', credentials: 'same-origin' });
        record(diagnostic(layer, 'HTTP_RESPONSE', { generation, status: response.status, elapsedMs: performance.now() - started, code: response.headers.get('X-Keledon-Voice-Error') || undefined }));
        if (!response.ok) {
          const problem = await response.json().catch(() => ({}));
          const candidate = response.headers.get('X-Keledon-Voice-Error') || problem.code;
          const code = typeof candidate === 'string' && /^MEET_(PREPARE|STT|BRAIN)_(TIMEOUT|UNAVAILABLE|HTTP_\d{3})$/.test(candidate) ? candidate : '';
          const service = path === '/tts/speak' ? 'TTS' : 'STT/Brain';
          throw new Error(`${service} rechazado (HTTP ${response.status})${code ? ` · ${code}` : ''}; revisa sesión, equipo o proveedor`);
        }
        return response;
      };
      void (async () => {
        try {
          setStatus('Audio remoto → STT configurado → Brain');
          setEvidence(v => ({ ...v, turns: s.turns }));
          const form = new FormData(); form.append('file', new Blob([d.audio], { type: 'audio/wav' }), 'remote.wav');
          if (s.mode !== 'stt') form.append('history', JSON.stringify(s.history.slice(-6)));
          const response = await request(`/api/brain/meet/${encodeURIComponent(s.teamId)}/${s.mode === 'stt' ? 'stt' : 'turn'}`, { method: 'POST', body: form });
          const result = await response.json();
          record(diagnostic('STT', 'TRANSCRIPTION_COMPLETED', { elapsedMs: result.timings?.sttMs, generation }));
          if (typeof result.timings?.brainMs === 'number') record(diagnostic('BRAIN', 'REPLY_COMPLETED', { elapsedMs: result.timings.brainMs, generation }));
          if (!current()) { setEvidence(v => ({ ...v, discarded: v.discarded + 1 })); return; }
          if (s.mode === 'stt') {
            if (result.teamId !== s.teamId || typeof result.transcript !== 'string' || result.transcript.length > 4000) throw new Error('Transcripción del equipo inválida');
            setLastTurn({ transcript: result.transcript, reply: '' }); stop('Capa STT completada; audio liberado. Confirma el texto reconocido.'); return;
          }
          if (result.teamId !== s.teamId || typeof result.transcript !== 'string' || typeof result.reply !== 'string' || result.reply.length > 4000) throw new Error('Respuesta de equipo inválida');
          if (result.goal?.type === 'search_case' && typeof result.goal.caseNumber === 'string' && /^\d{1,12}$/.test(result.goal.caseNumber)) {
            setStatus('Brain → Salesforce autorizado → lectura de caso exacto');
            try {
              const observation = await crm.lookup(result.goal.caseNumber, abort.signal);
              if (!current()) return;
              const grounded = await request(`/api/brain/meet/${encodeURIComponent(s.teamId)}/case-answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(observation) });
              const answer = await grounded.json();
              if (answer.teamId !== s.teamId || typeof answer.reply !== 'string' || answer.reply.length > 4000) throw new Error('Respuesta CRM inválida');
              result.reply = answer.reply;
            } catch (error) {
              if (!current()) return;
              record(diagnostic('CRM', 'NEEDS_ASSISTANCE'));
              result.reply = 'No pude verificar el caso en Salesforce. Necesito ayuda para enlazar la interfaz autorizada y confirmar el número.';
            }
          }
          if (!current()) return;
          s.closing = result.goal?.type === 'close';
          if (!result.transcript || !result.reply) { setStatus('No se reconoció voz; esperando otro turno'); return; }
          setLastTurn({ transcript: result.transcript, reply: result.reply });
          setStatus('Brain → TTS del equipo → Meet');
          const tts = await request('/tts/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: s.teamId, text: result.reply }) });
          if (tts.headers.get('X-Keledon-TTS-Team') !== s.teamId || !tts.headers.get('Content-Type')?.startsWith('audio/')) throw new Error('TTS del equipo no válido');
          const audio = await tts.arrayBuffer();
          if (!current()) { setEvidence(v => ({ ...v, discarded: v.discarded + 1 })); return; }
          if (!audio.byteLength || audio.byteLength > 8 * 1024 * 1024) throw new Error('Tamaño de audio TTS inválido');
          s.history.push({ role: 'user', content: result.transcript }, { role: 'assistant', content: result.reply });
          s.history = s.history.slice(-6);
          send(s, { type: 'speech', generation, audio });
          setStatus('Respuesta enviada; esperando reproducción en Meet');
        } catch (error) {
          record(diagnostic('LIFECYCLE', abort.signal.aborted ? 'TURN_ABORTED' : 'TURN_FAILED', { generation }));
          if (current()) stop(error instanceof Error ? error.message : 'Error de conversación');
          else if (abort.signal.aborted && s.generation === generation && s.active) stop('Tiempo de respuesta agotado');
          else setEvidence(v => ({ ...v, discarded: v.discarded + 1 }));
        } finally { clearTimeout(timeout); if (s.abort === abort) s.pending = false; }
      })();
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage); window.removeEventListener('pagehide', onPageHide);
      const s = link.current; if (s) { s.active = false; s.abort?.abort(); clearTimeout(s.timer); send(s, { type: 'stop' }); }
      link.current = null;
    };
  }, [teamId, disabled, crm.lookup, crm.cancel, record]);

  async function open() {
    try {
      const target = new URL(url);
      if (target.origin !== MEET_ORIGIN || !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(target.pathname) || target.search || target.hash || target.username || target.password) throw new Error('Introduce una URL de reunión Meet válida, sin parámetros');
      stop(); setConnected(false); setActive(false); setLastTurn({ transcript: '', reply: '' });
      setEvidence({ turns: 0, cancelled: 0, discarded: 0, delivered: 0 });
      // Open from the explicit click; opener binding is the transport, never an auth capability.
      const child = window.open(target.href, `keledon-meet-${crypto.randomUUID()}`, 'popup,width=1100,height=800');
      if (!child) throw new Error('Permite abrir la ventana Meet para esta conexión');
      link.current = { window: child, session: crypto.randomUUID(), teamId, generation: 0, active: false, pending: false, playing: false, turns: 0, expires: 0, history: [] };
      record(diagnostic('MEET', 'WINDOW_OPENED'));
      setUrl(''); setStatus('En Meet pulsa «Conectar con Brain»; entra con cámara apagada');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo abrir Meet'); }
  }
  async function start(mode: 'conversation' | 'stt' = 'conversation') {
    const s = link.current;
    if (!s || s.teamId !== teamId || disabled || layerBusy || s.window.closed || s.active) return;
    s.active = true; setActive(true);
    const authorization = new AbortController(); s.abort = authorization;
    const timer = setTimeout(() => authorization.abort(), 10000);
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Sesión vigente requerida');
      const response = await fetch(`/api/brain/meet/${encodeURIComponent(teamId)}/scope`, { headers: { Authorization: `Bearer ${token}` }, signal: authorization.signal, redirect: 'error' });
      if (!response.ok) throw new Error(`Equipo no autorizado (HTTP ${response.status})`);
      const scope = await response.json();
      if (link.current !== s || scope.teamId !== teamId || !s.active || authorization.signal.aborted) return;
      s.generation = 0; s.turns = 0; s.pending = false; s.playing = false; s.closing = false; s.history = [];
      s.mode = mode;
      setEvidence({ turns: 0, cancelled: 0, discarded: 0, delivered: 0 }); setLastTurn({ transcript: '', reply: '' });
      s.active = true; s.expires = Date.now() + 120000;
      s.timer = setTimeout(() => stop('Sesión de audio finalizada a los dos minutos'), 120000);
      send(s, { type: 'activate' }); setActive(true); setStatus('Equipo autorizado; en Meet pulsa «Iniciar audio Brain»');
      record(diagnostic('SESSION', 'TEAM_AUTHORIZED', { status: response.status }));
    } catch (error) { if (link.current === s && s.active) stop(error instanceof Error ? error.message : 'Autorización fallida'); }
    finally { clearTimeout(timer); }
  }
  const button = 'min-h-11 rounded border border-border px-4 py-2 disabled:opacity-50';
  return <section aria-label="Conversación remota de Meet" className="space-y-3 rounded border border-border p-3">
    <h2 className="font-medium">Meet → STT → Brain → TTS</h2>
    <p>Solo audio remoto de la reunión, sin micrófono físico del agente. Se envía a los proveedores del equipo seleccionado. Máximo dos minutos y seis turnos; sin grabación persistente. Usa únicamente frases ficticias durante la aceptación.</p>
    <p>Ingreso manual confirmado en Meet. La detección de oferta/alarma ACD requiere un adaptador de plataforma y no se simula aquí.</p>
    <label className="block">URL privada de Meet (no se guarda)<input className="block w-full rounded border border-border bg-background p-2" value={url} onChange={e => setUrl(e.target.value)} type="url" autoComplete="off" /></label>
    <div className="flex flex-wrap gap-3">
      <button className={button} disabled={disabled || !teamId || !url || active} onClick={() => void open()}>Abrir Meet y conectar</button>
      <button className={button} disabled={disabled || !connected || active || layerBusy} onClick={() => void start()}>Iniciar conversación remota</button>
      <button className={button} disabled={disabled || !connected || active || layerBusy} onClick={() => void start('stt')}>Escuchar un turno remoto · solo STT</button>
      <button className={button} disabled={!active} onClick={() => stop()}>Detener conversación remota</button>
      <button className={button} disabled={!connected} onClick={() => { const s = link.current; if (s) send(s, { type: 'inspect' }); }}>Inspeccionar transporte Meet</button>
      <button className={button} disabled={!active} onClick={() => { const s = link.current; if (s) send(s, { type: 'cancel' }); }}>Interrumpir respuesta y vaciar cola</button>
    </div>
    <p role="status">{status}</p>
    <output aria-label="Evidencia de conversación Meet">{JSON.stringify({ active, ...evidence })}</output>
    {lastTurn.transcript && <div><p>Reconocido: {lastTurn.transcript}</p>{lastTurn.reply && <p>Brain: {lastTurn.reply}</p>}<p className="text-sm">Texto efímero de esta vista; no se escribe en los logs de diagnóstico.</p></div>}
    <BrainLayerControls teamId={teamId} disabled={disabled} conversationActive={active} record={record} onBusy={setLayerBusy} sendAudio={audio => {
      const s = link.current;
      // Manual sample still requires a current server-authorized audio session.
      if (!s?.active || s.teamId !== teamId || s.window.closed || Date.now() >= s.expires || s.generation <= 0 || s.pending || s.playing) { setStatus('Autoriza e inicia el audio de Meet; espera a que el canal quede libre antes de enviar la muestra'); return; }
      send(s, { type: 'speech', generation: s.generation, audio });
      record(diagnostic('TTS', 'MANUAL_SAMPLE_SENT', { bytes: audio.byteLength, generation: s.generation }));
    }} />
    {crm.panel}
    <details><summary>Registro verbose seguro · {logs.length}/300 eventos</summary>
      <p>Solo metadatos de esta sesión. Sin audio, textos, URLs, identificadores personales ni secretos. Vaciar el log no borra la auditoría del servidor.</p>
      <button className={button} onClick={() => { void navigator.clipboard.writeText(JSON.stringify({ schema: 'meet-diagnostics-v1', events: logs }, null, 2)).then(() => setCopyStatus('Registro copiado'), () => setCopyStatus('No se pudo copiar; selecciona el registro visible')); }}>Copiar log completo</button>
      <button className={button} onClick={() => { setLogs([]); setCopyStatus('Registro local vaciado'); }}>Vaciar log local</button>
      <p role="status">{copyStatus}</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap">{JSON.stringify(logs, null, 2)}</pre>
    </details>
  </section>;
}
