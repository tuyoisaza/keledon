import { useTranslation } from '@/context/I18nContext';
import { useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/lib/api-fetch';
import { diagnostic, type Diagnostic } from './meet-diagnostics';

import type { State, Target } from './interface-control.types';
import { runAutomaticCycle } from './interface-automation';
const protocol = 'keledon-surface-v1';

export function InterfaceControlPanel({ teamId, disabled, record, onControlChange, voiceObjective, cancelEpoch, onReply, acousticAt=0, onAutomaticChange, onInteractionEnd, sourceActive=false, interactionEnded=0 }: {
  teamId: string; disabled: boolean; record: (row: Diagnostic) => void; onControlChange: (id: string | null) => void;
  voiceObjective: { text: string; generation: number } | null; cancelEpoch: number; onReply: (reply: string) => void; sourceActive?:boolean;interactionEnded?:number;acousticAt?:number; onAutomaticChange?:(active:boolean)=>void; onInteractionEnd?:()=>void;
}) {
  const {t}=useTranslation();
  const [automatic,setAutomatic]=useState(false),[autoPhase,setAutoPhase]=useState('idle');
  const acousticCandidate=useRef(acousticAt);acousticCandidate.current=acousticAt;
  const autoRunning=useRef(false), pendingGoal=useRef<string|null>(null), lastVoice=useRef('');
  const [targets, setTargets] = useState<Target[]>([]), [devices, setDevices] = useState<{ id: string; name: string; platform: string; version: string }[]>([]);
  const [targetId, setTargetId] = useState(''), [deviceId, setDeviceId] = useState(''), [transport, setTransport] = useState('extension');
  const [fiction, setFiction] = useState(false), [allowInteraction, setAllowInteraction] = useState(false), [voice, setVoice] = useState(false);
  const [state, setState] = useState<State | null>(null), [busy, setBusy] = useState(false), [connected, setConnected] = useState(false);
  const [goal, setGoal] = useState(''), [status, setStatus] = useState(t('interface.m1'));
  const [approved, setApproved] = useState(false), [selectedRef, setSelectedRef] = useState(''), [action, setAction] = useState('read'), [value, setValue] = useState(''), [expected, setExpected] = useState('');
  const current = useRef<State | null>(null), child = useRef<Window | null>(null), abort = useRef<AbortController | null>(null), epoch = useRef(0), pending = useRef<{ id: string; resolve: (value: any) => void; reject: (error: Error) => void } | null>(null);
  const setCurrent = (s: State | null) => { current.current = s; setState(s); setApproved(false); };
  async function api(path: string, body?: unknown, signal?: AbortSignal) {
    const token = getAuthToken(); if (!token) throw new Error(t('interface.m2'));
    const response = await fetch(`/api/brain/interfaces/${encodeURIComponent(teamId)}/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: signal || AbortSignal.timeout(10000), redirect: 'error', credentials: 'same-origin' });
    record(diagnostic('INTERFACE', 'HTTP_RESPONSE', { status: response.status }));
    if (!response.ok) throw new Error(t('interface.httpFailure')+' '+response.status);
    return response.json();
  }
  function send(s: State, data: Record<string, unknown>) { if (s.target.origin && child.current && !child.current.closed) child.current.postMessage({ protocol, session: s.id, generation: s.generation, ...data }, s.target.origin); }
  async function run(operation: (signal: AbortSignal) => Promise<void>) {
    if (busy || disabled) return;
    const owner = ++epoch.current, controller = new AbortController(); abort.current = controller;
    const timer = setTimeout(() => controller.abort(), 35000); setBusy(true); record(diagnostic('INTERFACE', 'OPERATION_STARTED'));
    try { await operation(controller.signal); }
    catch (error) { if(automatic && !controller.signal.aborted)setAutoPhase('attention'); if (owner === epoch.current) setStatus(controller.signal.aborted ? t('interface.m3') : error instanceof Error ? error.message : t('interface.m4')); record(diagnostic('INTERFACE', 'OPERATION_STOPPED')); }
    finally { clearTimeout(timer); if (owner === epoch.current) { setBusy(false); abort.current = null; } }
  }
  async function cancel(close = false, reason='pause') {
    epoch.current++; abort.current?.abort(); abort.current = null; setBusy(false); pending.current?.reject(new Error(t('interface.m5'))); pending.current = null;
    const s = current.current; if (!s) return;
    send(s, { type: close ? 'stop' : 'cancel', generation: s.generation + 1 });
    try { const result = await api(`${s.id}/cancel`, { close, keepAutomatic:reason==='interrupt' }); if (current.current?.id === s.id) setCurrent(close ? null : result); }
    catch { setCurrent(null); }
    if(reason!=='interrupt'){setAutomatic(false);setAutoPhase('idle');onAutomaticChange?.(false);}
    else if(automatic)setAutoPhase(p=>p==='standby'?'standby':'active');
    if (close) { setAutomatic(false);setAutoPhase('idle');onAutomaticChange?.(false); onControlChange(null); setConnected(false); }
    setStatus(close ? t('interface.m6') : t('interface.m7'));
    record(diagnostic('INTERFACE', close ? 'CLOSED' : 'CANCELLED'));
  }
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const s = current.current, d = event.data;
      if (!s || s.transport !== 'extension' || !child.current || event.source !== child.current || event.origin !== s.target.origin || d?.protocol !== protocol || Date.now() >= s.expires) return;
      if (d.type === 'ready') { send(s, { type: 'offer', origin: s.target.origin, expires: s.expires, allowInteraction: s.allowInteraction, policy:s.target.policy }); return; }
      if (d.session !== s.id || d.generation !== s.generation) return;
      if (d.type === 'connected') { setConnected(true); setStatus(t('interface.m8')); }
      if (d.type === 'closed') { void cancel(true); }
      if (d.type === 'result' && pending.current?.id === d.commandId) { const waiter = pending.current; pending.current = null; waiter.resolve(d.result); }
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive); epoch.current++; abort.current?.abort(); pending.current?.reject(new Error(t('interface.m9'))); pending.current = null;
      const s = current.current; if (s) { send(s, { type: 'stop' }); void api(`${s.id}/cancel`, { close: true }).catch(() => {}); } current.current = null; onControlChange(null);
    };
  }, [teamId, disabled]);
  useEffect(() => { setCurrent(null); setTargets([]); setTargetId(''); setDevices([]); setDeviceId(''); setConnected(false); setBusy(false); setGoal(''); setFiction(false); setVoice(false); }, [teamId, disabled]);
  useEffect(() => { onControlChange(voice && state ? state.id : null); }, [voice, state?.id, onControlChange]);
  useEffect(() => { if (voice && voiceObjective) { const key=String(voiceObjective.generation)+voiceObjective.text;if(key!==lastVoice.current){lastVoice.current=key;pendingGoal.current=voiceObjective.text.slice(0,1600);} setGoal(voiceObjective.text.slice(0, 1600)); setStatus(t('interface.m10')); } }, [voiceObjective]);
  const lastCancel = useRef(cancelEpoch);
  useEffect(() => { if (lastCancel.current !== cancelEpoch) { lastCancel.current = cancelEpoch; if (current.current) void cancel(false,'interrupt'); } }, [cancelEpoch]);
  useEffect(() => { if (!state) return; const timer = setTimeout(() => { void cancel(true); }, Math.max(1, state.expires - Date.now())); return () => clearTimeout(timer); }, [state?.id]);
  async function command(operation: 'open' | 'observe' | 'act', signal: AbortSignal) {
    const s = current.current; if (!s) throw new Error(t('interface.m11'));
    const issued = await api(`${s.id}/command`, { operation, planId: s.plan?.id, approved: operation === 'act' && !automatic && approved, automatic:operation==='act' && automatic }, signal);
    let result: any;
    if (s.transport === 'extension') {
      if (!connected) throw new Error(t('interface.m12'));
      result = await new Promise((resolve, reject) => {
        pending.current = { id: issued.commandId, resolve, reject }; signal.addEventListener('abort', () => { pending.current?.reject(new Error(t('interface.m13'))); pending.current = null; }, { once: true });
        send(s, { type: 'command', commandId: issued.commandId, operation, revision: issued.revision, action: issued.action });
      });
      result = await api(`${s.id}/result`, { commandId: issued.commandId, generation: s.generation, result }, signal);
    } else {
      const deadline = Date.now() + 26000;
      while (!signal.aborted && Date.now() < deadline) {
        const snapshot = await api(s.id, undefined, signal);
        if (snapshot.command?.id === issued.commandId && snapshot.command.result) { result = snapshot.command.result; break; }
        await new Promise<void>((resolve, reject) => { const timer = setTimeout(resolve, 700); signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error(t('interface.m13'))); }, { once: true }); });
      }
      if (!result) throw new Error(t('interface.m14'));
    }
    if (signal.aborted || current.current?.id !== s.id || current.current.generation !== s.generation) return;
    const snapshot = await api(s.id, undefined, signal); setCurrent(snapshot);
    setStatus(`${result.code}${result.verified ? t('interface.m15') : t('interface.m16')}`);
    record(diagnostic('INTERFACE', 'EXECUTOR_RESULT', { code: result.code }));
    return result;
  }
  useEffect(()=>{if(automatic && !sourceActive)void cancel(true);},[sourceActive]);
  useEffect(()=>{pendingGoal.current=null;if(current.current){setAutoPhase(current.current.target.policy?.incoming?'standby':'active');void cancel(false,'interrupt');}},[interactionEnded]);
  async function toggleAutomatic(){
    const s=current.current;if(!s)return;
    await run(async signal=>{const next=!automatic;setCurrent(await api(`${s.id}/automation`,{enabled:next},signal));setAutomatic(next);if(next)setVoice(true);onAutomaticChange?.(next);pendingGoal.current=null;setAutoPhase(next?(s.target.policy?.incoming?'standby':'active'):'idle');});
  }
  const automaticCycle=(signal:AbortSignal)=>runAutomaticCycle({read:()=>current.current,write:setCurrent,connected,phase:autoPhase,acousticAt:acousticCandidate.current,pendingGoal,setPhase:setAutoPhase,reply:onReply,ended:onInteractionEnd,command,api},signal);
  useEffect(()=>{if(!automatic || autoPhase==='attention' || disabled || !sourceActive || !state)return;
    const timer=setInterval(()=>{if(autoRunning.current || busy)return;autoRunning.current=true;void run(automaticCycle).finally(()=>{autoRunning.current=false;});},2000);
    return()=>clearInterval(timer);
  },[automatic,disabled,state?.id,state?.generation,busy,autoPhase,connected,sourceActive]);
  const button = 'min-h-11 rounded border border-border px-3 py-2 disabled:opacity-50', locked = disabled || busy || !teamId;
  const target = targets.find(t => t.id === targetId), element = state?.observation?.elements.find(e => e.ref === selectedRef);
  return <section aria-label={t('interface.title')} className="space-y-3 rounded border border-border p-3">
    <h2 className="font-medium">{t('interface.l1')}</h2>
    <p>{t('interface.l2')}</p>
    <button className={button} disabled={locked || !!state} onClick={() => void run(async signal => { const data = await api('targets', undefined, signal); if (data.teamId !== teamId) throw new Error(t('interface.m17')); setTargets(data.targets); setDevices(data.devices); setStatus(t('interface.m18')); })}>{t('interface.l3')}</button>
    <label className="block">{t('interface.l4')}<select value={targetId} disabled={locked || !!state} onChange={e => { setTargetId(e.target.value); if (targets.find(t => t.id === e.target.value)?.kind === 'native') setTransport('device'); }}><option value="">{t('interface.l5')}</option>{targets.map(t => <option key={t.id} value={t.id}>{t.name} · {t.kind === 'native' ? 'Windows' : 'web'}</option>)}</select></label>
    <label className="block">{t('interface.l6')}<select value={transport} disabled={locked || !!state} onChange={e => setTransport(e.target.value)}><option value="extension" disabled={target?.kind === 'native'}>{t('interface.l7')}</option><option value="device">{t('interface.l8')}</option></select></label>
    {transport === 'device' && <label className="block">{t('interface.l9')}<select value={deviceId} disabled={locked || !!state} onChange={e => setDeviceId(e.target.value)}><option value="">{t('interface.l10')}</option>{devices.map(d => <option key={d.id} value={d.id}>{d.name} · {d.platform} · {d.version || t('interface.m19')}</option>)}</select></label>}
    <label className="block"><input type="checkbox" disabled={!!state} checked={fiction} onChange={e => setFiction(e.target.checked)} /> {t('interface.l11')}</label>
    <label className="block"><input type="checkbox" disabled={!!state} checked={allowInteraction} onChange={e => setAllowInteraction(e.target.checked)} /> {t('interface.l12')}</label>
    <button className={button} disabled={locked || !!state || !fiction || !target || (transport === 'device' && !deviceId)} onClick={() => {
      const childWindow = transport === 'extension' && target?.url ? window.open(target.url, `keledon-surface-${crypto.randomUUID()}`, 'popup,width=1100,height=800') : null;
      if (transport === 'extension' && !childWindow) { setStatus(t('interface.m20')); return; }
      child.current = childWindow;
      void run(async signal => { try { const s = await api('open', { targetId, transport, deviceId, syntheticOnly: fiction, allowInteraction }, signal); if (signal.aborted) return; setCurrent(s); setStatus(transport === 'extension' ? t('interface.m21') : t('interface.m22')); } catch (error) { childWindow?.close(); throw error; } });
    }}>{t('interface.l13')}</button>
    <div className="flex flex-wrap gap-2">
      {state?.transport === 'device' && <button className={button} disabled={locked} onClick={() => void run(signal => command('open', signal))}>{t('interface.l14')}</button>}
      <button className={button} disabled={locked || !state || (transport === 'extension' && !connected)} onClick={() => void run(signal => command('observe', signal))}>{t('interface.l15')}</button>
      <button className={button} disabled={!state} onClick={() => void cancel()}>{t('interface.l16')}</button>
      <button className={button} disabled={!state} onClick={() => void cancel(true)}>{t('interface.l17')}</button>
    </div>
    <button type="button" className={button} disabled={locked || !state || !sourceActive || !allowInteraction || !state.target.policy?.rules.length} onClick={()=>void toggleAutomatic()}>{t(automatic?'interface.autoStop':'interface.autoArm')}</button><p role="status">{t('interface.autoPhase')}: {t('interface.phase.'+autoPhase)}</p><p>{t('interface.autoHelp')}</p>
    <p role="status">{status}</p>
    {state && <p>{t('interface.sessionHelp')} {state.generation}. {t('interface.observedOnly')}</p>}
    {state?.observation && <details><summary>{t('interface.observation')} · {state.observation.elements.length} {t('interface.elements')} · {state.observation.capabilities.join(', ')}</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap">{state.observation.elements.map(e => `${e.ref} · ${e.role} · ${e.name} · ${e.destination||''} · ${e.policyRuleId||''} · ${e.actions.join(', ')}`).join('\n')}</pre><p>{state.observation.text}</p></details>}
    <label className="block">{t('interface.l18')}<textarea className="block w-full rounded border border-border bg-background p-2" maxLength={1600} value={goal} onChange={e => setGoal(e.target.value)} /></label>
    <label className="block"><input type="checkbox" checked={voice} disabled={!state} onChange={e => setVoice(e.target.checked)} /> {t('interface.l19')}</label>
    <button className={button} disabled={locked || !state?.observation || !goal.trim()} onClick={() => void run(async signal => { const s = current.current!; const result = await api(`${s.id}/plan`, { goal }, signal); if (signal.aborted) return; setCurrent(result); setStatus(`${result.plannerStatus}: ${result.explanation || t('interface.m23')}`); })}>{t('interface.l20')}</button>
    {state?.plan && <div><p>{t('interface.proposal')}: {state.plan.action.type} {t('interface.on')} {state.plan.action.ref} · {t('interface.effect')} {state.plan.action.effect}</p>{state.plan.action.value && <p>{t('interface.proposedValue')}: {state.plan.action.value}</p>}<p>{t('interface.postcondition')}: {state.plan.action.expected || t('interface.m24')}</p><label><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> {t('interface.l21')}</label><button className={button} disabled={locked || !approved} onClick={() => void run(signal => command('act', signal))}>{t('interface.l22')}</button></div>}
    <details><summary>{t('interface.l23')}</summary>
      <label>{t('interface.l24')}<select value={selectedRef} onChange={e => { setSelectedRef(e.target.value); setAction('read'); }}><option value="">{t('interface.l25')}</option>{state?.observation?.elements.map(e => <option key={e.ref} value={e.ref}>{e.ref} · {e.name || e.role}</option>)}</select></label>
      <label>{t('interface.l26')}<select value={action} onChange={e => setAction(e.target.value)}>{(element?.actions || ['read']).map(a => <option key={a} value={a}>{t('interface.action_'+a)}</option>)}</select></label>
      <label>{t('interface.l27')}<input maxLength={500} value={value} onChange={e => setValue(e.target.value)} /></label>
      <label>{t('interface.l28')}<input maxLength={300} value={expected} onChange={e => setExpected(e.target.value)} /></label>
      <button className={button} disabled={locked || !element || !state} onClick={() => void run(async signal => { const result = await api(`${state!.id}/manual-plan`, { type: action, ref: selectedRef, value, expected, effect: action === 'fill' ? 'search' : action === 'activate' ? (state!.target.policy?.rules.find(r=>r.id===element?.policyRuleId)?.kind==='navigate'?'navigate':['accept-call','end-call'].includes(state!.target.policy?.rules.find(r=>r.id===element?.policyRuleId)?.kind||'')?'call':'search') : 'read' }, signal); if (!signal.aborted) setCurrent(result); })}>{t('interface.l29')}</button>
    </details>
    <button className={button} disabled={locked || !state?.observation || !goal.trim()} onClick={() => void run(async signal => { const result = await api(`${state!.id}/reply`, { goal }, signal); if (signal.aborted) return; setStatus(result.reply); onReply(result.reply); })}>{t('interface.l30')}</button>
  </section>;
}
