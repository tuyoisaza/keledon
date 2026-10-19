import { useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/lib/api-fetch';

const MEET_ORIGIN = 'https://meet.google.com';
const PROTOCOL = 'keledon-meet-v1';
type Turn = { role: 'user' | 'assistant'; content: string };
type Link = { window: Window; session: string; teamId: string; generation: number; active: boolean; pending: boolean; playing: boolean; turns: number; expires: number; abort?: AbortController; timer?: ReturnType<typeof setTimeout>; history: Turn[] };

/** Opt-in audio bridge. Credentials stay here; Meet can supply only bounded audio/cancel events. */
export function BrainMeetPanel({ teamId, disabled }: { teamId: string; disabled: boolean }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Sin enlace de Meet');
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(false);
  const [evidence, setEvidence] = useState({ turns: 0, cancelled: 0, discarded: 0, delivered: 0 });
  const [lastTurn, setLastTurn] = useState({ transcript: '', reply: '' });
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
      if (d.type === 'closed') { stop('Meet liberó el enlace'); setConnected(false); return; }
      if (!s.active || Date.now() >= s.expires) return;
      if (d.type === 'interrupt' && Number.isSafeInteger(d.generation) && d.generation > s.generation) {
        if (s.pending || s.playing) setEvidence(v => ({ ...v, cancelled: v.cancelled + 1 }));
        s.generation = d.generation; s.abort?.abort();
        s.playing = false; setStatus('Voz remota detectada; respuesta anterior cancelada'); return;
      }
      if (d.type === 'started' && d.generation === s.generation) { s.playing = true; return; }
      if (d.type === 'played' && d.generation === s.generation) {
        s.playing = false;
        setEvidence(v => ({ ...v, delivered: v.delivered + 1 })); setStatus('Respuesta enviada a Meet; esperando voz remota'); return;
      }
      if (d.type === 'error') { stop('Meet no pudo reproducir/capturar el audio'); return; }
      if (d.type !== 'turn' || d.generation !== s.generation || !(d.audio instanceof ArrayBuffer) || d.audio.byteLength < 3244 || d.audio.byteLength > 384044) return;
      if (++s.turns > 6) { stop('Límite de seis turnos alcanzado'); return; }
      const generation = s.generation;
      s.pending = true;
      s.abort?.abort();
      const abort = new AbortController(); s.abort = abort;
      const timeout = setTimeout(() => abort.abort(), 45000);
      const current = () => link.current === s && s.active && generation === s.generation && !abort.signal.aborted && Date.now() < s.expires;
      const request = async (path: string, options: RequestInit) => {
        const token = getAuthToken();
        if (!token) throw new Error('Sesión ausente; inicia sesión de nuevo');
        const headers = new Headers(options.headers); headers.set('Authorization', `Bearer ${token}`);
        const response = await fetch(path, { ...options, headers, signal: abort.signal, redirect: 'error', credentials: 'same-origin' });
        if (!response.ok) throw new Error(`STT/Brain/TTS rechazado (HTTP ${response.status}); revisa sesión, equipo o proveedor`);
        return response;
      };
      void (async () => {
        try {
          setStatus('Audio remoto → STT configurado → Brain');
          setEvidence(v => ({ ...v, turns: s.turns }));
          const form = new FormData(); form.append('file', new Blob([d.audio], { type: 'audio/wav' }), 'remote.wav');
          form.append('history', JSON.stringify(s.history.slice(-6)));
          const response = await request(`/api/brain/meet/${encodeURIComponent(s.teamId)}/turn`, { method: 'POST', body: form });
          const result = await response.json();
          if (!current()) { setEvidence(v => ({ ...v, discarded: v.discarded + 1 })); return; }
          if (result.teamId !== s.teamId || typeof result.transcript !== 'string' || typeof result.reply !== 'string' || result.reply.length > 4000) throw new Error('Respuesta de equipo inválida');
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
  }, [teamId, disabled]);

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
      setUrl(''); setStatus('En Meet pulsa «Conectar con Brain»; entra con cámara apagada');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo abrir Meet'); }
  }
  async function start() {
    const s = link.current;
    if (!s || s.teamId !== teamId || disabled || s.window.closed || s.active) return;
    s.active = true; setActive(true);
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Sesión vigente requerida');
      const response = await fetch(`/api/brain/meet/${encodeURIComponent(teamId)}/scope`, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error' });
      if (!response.ok) throw new Error(`Equipo no autorizado (HTTP ${response.status})`);
      const scope = await response.json();
      if (link.current !== s || scope.teamId !== teamId) throw new Error('El contexto cambió');
      s.active = true; s.expires = Date.now() + 120000;
      s.timer = setTimeout(() => stop('Sesión de audio finalizada a los dos minutos'), 120000);
      send(s, { type: 'activate' }); setActive(true); setStatus('Equipo autorizado; en Meet pulsa «Iniciar audio Brain»');
    } catch (error) { stop(error instanceof Error ? error.message : 'Autorización fallida'); }
  }
  const button = 'min-h-11 rounded border border-border px-4 py-2 disabled:opacity-50';
  return <section aria-label="Conversación remota de Meet" className="space-y-3 rounded border border-border p-3">
    <h2 className="font-medium">Meet → STT → Brain → TTS</h2>
    <p>Solo audio remoto de la reunión, sin micrófono físico del agente. Se envía a los proveedores del equipo seleccionado. Máximo dos minutos y seis turnos; sin grabación persistente. Usa únicamente frases ficticias durante la aceptación.</p>
    <label className="block">URL privada de Meet (no se guarda)<input className="block w-full rounded border border-border bg-background p-2" value={url} onChange={e => setUrl(e.target.value)} type="url" autoComplete="off" /></label>
    <div className="flex flex-wrap gap-3">
      <button className={button} disabled={disabled || !teamId || !url || active} onClick={() => void open()}>Abrir Meet y conectar</button>
      <button className={button} disabled={disabled || !connected || active} onClick={() => void start()}>Iniciar conversación remota</button>
      <button className={button} disabled={!active} onClick={() => stop()}>Detener conversación remota</button>
    </div>
    <p role="status">{status}</p>
    <output aria-label="Evidencia de conversación Meet">{JSON.stringify({ active, ...evidence })}</output>
    {lastTurn.transcript && <div><p>Reconocido: {lastTurn.transcript}</p><p>Brain: {lastTurn.reply}</p><p className="text-sm">Texto efímero de esta vista; no se escribe en los logs de diagnóstico.</p></div>}
  </section>;
}
