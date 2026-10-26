import { useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/lib/api-fetch';
import { diagnostic, type Diagnostic } from './meet-diagnostics';

type Element = { ref: string; role: string; name: string; value?: string; actions: string[] };
type Observation = { revision: string; text: string; elements: Element[]; capabilities: string[] };
type Target = { id: string; name: string; kind: 'web' | 'native'; origin?: string; url?: string };
type State = { id: string; teamId: string; generation: number; target: Target; transport: string; expires: number; allowInteraction: boolean; observation?: Observation; plan?: { id: string; revision: string; action: { type: string; ref: string; value?: string; expected: string; effect: string } }; command?: { id: string; expires: number; result?: any } };
const protocol = 'keledon-surface-v1';

export function InterfaceControlPanel({ teamId, disabled, record, onControlChange, voiceObjective, cancelEpoch, onReply }: {
  teamId: string; disabled: boolean; record: (row: Diagnostic) => void; onControlChange: (id: string | null) => void;
  voiceObjective: { text: string; generation: number } | null; cancelEpoch: number; onReply: (reply: string) => void;
}) {
  const [targets, setTargets] = useState<Target[]>([]), [devices, setDevices] = useState<{ id: string; name: string; platform: string; version: string }[]>([]);
  const [targetId, setTargetId] = useState(''), [deviceId, setDeviceId] = useState(''), [transport, setTransport] = useState('extension');
  const [fiction, setFiction] = useState(false), [allowInteraction, setAllowInteraction] = useState(false), [voice, setVoice] = useState(false);
  const [state, setState] = useState<State | null>(null), [busy, setBusy] = useState(false), [connected, setConnected] = useState(false);
  const [goal, setGoal] = useState(''), [status, setStatus] = useState('Sin control activo. Ninguna interfaz se observa automáticamente.');
  const [approved, setApproved] = useState(false), [selectedRef, setSelectedRef] = useState(''), [action, setAction] = useState('read'), [value, setValue] = useState(''), [expected, setExpected] = useState('');
  const current = useRef<State | null>(null), child = useRef<Window | null>(null), abort = useRef<AbortController | null>(null), epoch = useRef(0), pending = useRef<{ id: string; resolve: (value: any) => void; reject: (error: Error) => void } | null>(null);
  const setCurrent = (s: State | null) => { current.current = s; setState(s); setApproved(false); };
  async function api(path: string, body?: unknown, signal?: AbortSignal) {
    const token = getAuthToken(); if (!token) throw new Error('Sesión vigente requerida');
    const response = await fetch(`/api/brain/interfaces/${encodeURIComponent(teamId)}/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: signal || AbortSignal.timeout(10000), redirect: 'error', credentials: 'same-origin' });
    record(diagnostic('INTERFACE', 'HTTP_RESPONSE', { status: response.status }));
    if (!response.ok) throw new Error(`Control de interfaz: HTTP ${response.status}. Revisa sesión, equipo y autorización.`);
    return response.json();
  }
  function send(s: State, data: Record<string, unknown>) { if (s.target.origin && child.current && !child.current.closed) child.current.postMessage({ protocol, session: s.id, generation: s.generation, ...data }, s.target.origin); }
  async function run(operation: (signal: AbortSignal) => Promise<void>) {
    if (busy || disabled) return;
    const owner = ++epoch.current, controller = new AbortController(); abort.current = controller;
    const timer = setTimeout(() => controller.abort(), 35000); setBusy(true); record(diagnostic('INTERFACE', 'OPERATION_STARTED'));
    try { await operation(controller.signal); }
    catch (error) { if (owner === epoch.current) setStatus(controller.signal.aborted ? 'Operación cancelada o tiempo agotado; observa de nuevo' : error instanceof Error ? error.message : 'Operación no disponible'); record(diagnostic('INTERFACE', 'OPERATION_STOPPED')); }
    finally { clearTimeout(timer); if (owner === epoch.current) { setBusy(false); abort.current = null; } }
  }
  async function cancel(close = false) {
    epoch.current++; abort.current?.abort(); abort.current = null; setBusy(false); pending.current?.reject(new Error('Control cancelado')); pending.current = null;
    const s = current.current; if (!s) return;
    send(s, { type: close ? 'stop' : 'cancel', generation: s.generation + 1 });
    try { const result = await api(`${s.id}/cancel`, { close }); if (current.current?.id === s.id) setCurrent(close ? null : result); }
    catch { setCurrent(null); }
    if (close) { onControlChange(null); setConnected(false); }
    setStatus(close ? 'Control liberado; referencias y observaciones eliminadas' : 'Acciones canceladas; vuelve a observar la interfaz');
    record(diagnostic('INTERFACE', close ? 'CLOSED' : 'CANCELLED'));
  }
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const s = current.current, d = event.data;
      if (!s || s.transport !== 'extension' || !child.current || event.source !== child.current || event.origin !== s.target.origin || d?.protocol !== protocol || Date.now() >= s.expires) return;
      if (d.type === 'ready') { send(s, { type: 'offer', origin: s.target.origin, expires: s.expires, allowInteraction: s.allowInteraction }); return; }
      if (d.session !== s.id || d.generation !== s.generation) return;
      if (d.type === 'connected') { setConnected(true); setStatus('Interfaz enlazada; pulsa Observar. Sin ejecución automática.'); }
      if (d.type === 'closed') { void cancel(true); }
      if (d.type === 'result' && pending.current?.id === d.commandId) { const waiter = pending.current; pending.current = null; waiter.resolve(d.result); }
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive); epoch.current++; abort.current?.abort(); pending.current?.reject(new Error('Contexto cambiado')); pending.current = null;
      const s = current.current; if (s) { send(s, { type: 'stop' }); void api(`${s.id}/cancel`, { close: true }).catch(() => {}); } current.current = null; onControlChange(null);
    };
  }, [teamId, disabled]);
  useEffect(() => { setCurrent(null); setTargets([]); setTargetId(''); setDevices([]); setDeviceId(''); setConnected(false); setBusy(false); setGoal(''); setFiction(false); setVoice(false); }, [teamId, disabled]);
  useEffect(() => { onControlChange(voice && state ? state.id : null); }, [voice, state?.id, onControlChange]);
  useEffect(() => { if (voice && voiceObjective) { setGoal(voiceObjective.text.slice(0, 1600)); setStatus('Objetivo remoto recibido. Observa y pide a Brain el siguiente paso.'); } }, [voiceObjective]);
  const lastCancel = useRef(cancelEpoch);
  useEffect(() => { if (lastCancel.current !== cancelEpoch) { lastCancel.current = cancelEpoch; if (current.current) void cancel(); } }, [cancelEpoch]);
  useEffect(() => { if (!state) return; const timer = setTimeout(() => { void cancel(true); }, Math.max(1, state.expires - Date.now())); return () => clearTimeout(timer); }, [state?.id]);
  async function command(operation: 'open' | 'observe' | 'act', signal: AbortSignal) {
    const s = current.current; if (!s) throw new Error('Abre primero un control autorizado');
    const issued = await api(`${s.id}/command`, { operation, planId: s.plan?.id, approved: operation === 'act' && approved }, signal);
    let result: any;
    if (s.transport === 'extension') {
      if (!connected) throw new Error('Activa la extensión en la ventana abierta y conecta con Brain');
      result = await new Promise((resolve, reject) => {
        pending.current = { id: issued.commandId, resolve, reject }; signal.addEventListener('abort', () => { pending.current?.reject(new Error('Operación cancelada')); pending.current = null; }, { once: true });
        send(s, { type: 'command', commandId: issued.commandId, operation, revision: issued.revision, action: issued.action });
      });
      result = await api(`${s.id}/result`, { commandId: issued.commandId, generation: s.generation, result }, signal);
    } else {
      const deadline = Date.now() + 26000;
      while (!signal.aborted && Date.now() < deadline) {
        const snapshot = await api(s.id, undefined, signal);
        if (snapshot.command?.id === issued.commandId && snapshot.command.result) { result = snapshot.command.result; break; }
        await new Promise<void>((resolve, reject) => { const timer = setTimeout(resolve, 700); signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Operación cancelada')); }, { once: true }); });
      }
      if (!result) throw new Error('Ejecutor no respondió. Comprueba versión, pairing y consentimiento local.');
    }
    if (signal.aborted || current.current?.id !== s.id || current.current.generation !== s.generation) return;
    const snapshot = await api(s.id, undefined, signal); setCurrent(snapshot);
    setStatus(`${result.code}${result.verified ? ' · postcondición textual observada; confirma el objetivo' : ' · resultado requiere revisión; no se presupone éxito'}`);
    record(diagnostic('INTERFACE', 'EXECUTOR_RESULT', { code: result.code }));
  }
  const button = 'min-h-11 rounded border border-border px-3 py-2 disabled:opacity-50', locked = disabled || busy || !teamId;
  const target = targets.find(t => t.id === targetId), element = state?.observation?.elements.find(e => e.ref === selectedRef);
  return <section aria-label="Control general de interfaces" className="space-y-3 rounded border border-border p-3">
    <h2 className="font-medium">Control general de interfaces · Brain → observar → actuar → verificar</h2>
    <p>Superficies web y aplicaciones Windows autorizadas por equipo. Solo datos ficticios. Entrada y activación limitadas a controles identificados de búsqueda; cada paso requiere revisión. Sin contraseñas, envíos, compras o cambios de registros. Una extensión web no controla por sí sola ventanas nativas.</p>
    <button className={button} disabled={locked || !!state} onClick={() => void run(async signal => { const data = await api('targets', undefined, signal); if (data.teamId !== teamId) throw new Error('Equipo incorrecto'); setTargets(data.targets); setDevices(data.devices); setStatus('Destinos configurados cargados; disponibilidad real aún sin verificar'); })}>Cargar interfaces y ejecutores autorizados</button>
    <label className="block">Interfaz<select value={targetId} disabled={locked || !!state} onChange={e => { setTargetId(e.target.value); if (targets.find(t => t.id === e.target.value)?.kind === 'native') setTransport('device'); }}><option value="">Seleccionar superficie</option>{targets.map(t => <option key={t.id} value={t.id}>{t.name} · {t.kind === 'native' ? 'Windows' : 'web'}</option>)}</select></label>
    <label className="block">Ejecutor<select value={transport} disabled={locked || !!state} onChange={e => setTransport(e.target.value)}><option value="extension" disabled={target?.kind === 'native'}>Extensión en Chrome/Edge · activación explícita</option><option value="device">Browser / host Windows emparejado</option></select></label>
    {transport === 'device' && <label className="block">Dispositivo<select value={deviceId} disabled={locked || !!state} onChange={e => setDeviceId(e.target.value)}><option value="">Seleccionar dispositivo del equipo</option>{devices.map(d => <option key={d.id} value={d.id}>{d.name} · {d.platform} · {d.version || 'versión sin verificar'}</option>)}</select></label>}
    <label className="block"><input type="checkbox" disabled={!!state} checked={fiction} onChange={e => setFiction(e.target.checked)} /> Esta superficie contiene únicamente datos ficticios autorizados</label>
    <label className="block"><input type="checkbox" disabled={!!state} checked={allowInteraction} onChange={e => setAllowInteraction(e.target.checked)} /> Permitir entrada y activación de controles no destructivos, con autorización de cada paso</label>
    <button className={button} disabled={locked || !!state || !fiction || !target || (transport === 'device' && !deviceId)} onClick={() => {
      const childWindow = transport === 'extension' && target?.url ? window.open(target.url, `keledon-surface-${crypto.randomUUID()}`, 'popup,width=1100,height=800') : null;
      if (transport === 'extension' && !childWindow) { setStatus('Permite abrir la superficie desde Brain'); return; }
      child.current = childWindow;
      void run(async signal => { try { const s = await api('open', { targetId, transport, deviceId, syntheticOnly: fiction, allowInteraction }, signal); if (signal.aborted) return; setCurrent(s); setStatus(transport === 'extension' ? 'En la ventana abierta: extensión → Activar control → Conectar con Brain' : 'Control creado; pulsa Abrir en ejecutor y confirma la ventana en el puesto Windows'); } catch (error) { childWindow?.close(); throw error; } });
    }}>Abrir control autorizado</button>
    <div className="flex flex-wrap gap-2">
      {state?.transport === 'device' && <button className={button} disabled={locked} onClick={() => void run(signal => command('open', signal))}>Abrir en ejecutor / elegir ventana local</button>}
      <button className={button} disabled={locked || !state || (transport === 'extension' && !connected)} onClick={() => void run(signal => command('observe', signal))}>Observar interfaz</button>
      <button className={button} disabled={!state} onClick={() => void cancel()}>Pausar / cancelar acciones</button>
      <button className={button} disabled={!state} onClick={() => void cancel(true)}>Liberar interfaz</button>
    </div>
    <p role="status">{status}</p>
    {state && <p>Sesión acotada: dos minutos · doce pasos · generación {state.generation}. Solo capacidades realmente observadas.</p>}
    {state?.observation && <details><summary>Observación efímera · {state.observation.elements.length} elementos · {state.observation.capabilities.join(', ')}</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap">{state.observation.elements.map(e => `${e.ref} · ${e.role} · ${e.name} · ${e.actions.join(', ')}`).join('\n')}</pre><p>{state.observation.text}</p></details>}
    <label className="block">Objetivo para Brain<textarea className="block w-full rounded border border-border bg-background p-2" maxLength={1600} value={goal} onChange={e => setGoal(e.target.value)} /></label>
    <label className="block"><input type="checkbox" checked={voice} disabled={!state} onChange={e => setVoice(e.target.checked)} /> Recibir el objetivo desde la conversación remota de Meet</label>
    <button className={button} disabled={locked || !state?.observation || !goal.trim()} onClick={() => void run(async signal => { const s = current.current!; const result = await api(`${s.id}/plan`, { goal }, signal); if (signal.aborted) return; setCurrent(result); setStatus(`${result.plannerStatus}: ${result.explanation || 'revisa la propuesta'}`); })}>Pedir siguiente paso a Brain / verificar objetivo</button>
    {state?.plan && <div><p>Propuesta: {state.plan.action.type} sobre {state.plan.action.ref} · efecto {state.plan.action.effect}</p>{state.plan.action.value && <p>Dato ficticio propuesto: {state.plan.action.value}</p>}<p>Postcondición propuesta: {state.plan.action.expected || 'sin verificación automática'}</p><label><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> Confirmo este paso concreto y su efecto no destructivo</label><button className={button} disabled={locked || !approved} onClick={() => void run(signal => command('act', signal))}>Ejecutar paso autorizado y volver a observar</button></div>}
    <details><summary>Control manual por elemento observado</summary>
      <label>Elemento<select value={selectedRef} onChange={e => { setSelectedRef(e.target.value); setAction('read'); }}><option value="">Seleccionar referencia actual</option>{state?.observation?.elements.map(e => <option key={e.ref} value={e.ref}>{e.ref} · {e.name || e.role}</option>)}</select></label>
      <label>Acción<select value={action} onChange={e => setAction(e.target.value)}>{(element?.actions || ['read']).map(a => <option key={a}>{a}</option>)}</select></label>
      <label>Valor ficticio<input maxLength={500} value={value} onChange={e => setValue(e.target.value)} /></label>
      <label>Texto esperado tras actuar<input maxLength={300} value={expected} onChange={e => setExpected(e.target.value)} /></label>
      <button className={button} disabled={locked || !element || !state} onClick={() => void run(async signal => { const result = await api(`${state!.id}/manual-plan`, { type: action, ref: selectedRef, value, expected, effect: action === 'fill' ? 'search' : action === 'activate' ? 'navigate' : 'read' }, signal); if (!signal.aborted) setCurrent(result); })}>Preparar paso manual para autorizar</button>
    </details>
    <button className={button} disabled={locked || !state?.observation || !goal.trim()} onClick={() => void run(async signal => { const result = await api(`${state!.id}/reply`, { goal }, signal); if (signal.aborted) return; setStatus(result.reply); onReply(result.reply); })}>Devolver observación a Brain y responder en Meet si está activo</button>
  </section>;
}
