import { useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/lib/api-fetch';
import { diagnostic, type Diagnostic, type Layer } from './meet-diagnostics';

export function BrainLayerControls({ teamId, disabled, conversationActive, record, sendAudio, onBusy }: {
  teamId: string; disabled: boolean; conversationActive: boolean; record: (row: Diagnostic) => void;
  sendAudio: (audio: ArrayBuffer) => void; onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Sin ejecutar. Cada botón invoca únicamente su capa.');
  const [text, setText] = useState('Hola Brain, salúdame en español.');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const audio = useRef<ArrayBuffer | null>(null);
  const request = useRef<AbortController | null>(null);
  const context = useRef<AudioContext | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; onBusy(false); void context.current?.close().catch(() => {}); context.current = null; audio.current = null; }, [teamId, disabled, onBusy]);
  useEffect(() => { setBusy(false); setTranscript(''); setReply(''); setText('Hola Brain, salúdame en español.'); setFile(null); setAudioReady(false); setStatus('Sin ejecutar. Cada botón invoca únicamente su capa.'); audio.current = null; }, [teamId, disabled]);
  async function run(layer: Layer, path: string, init: RequestInit) {
    if (busy || disabled || conversationActive || !teamId) return;
    setBusy(true); onBusy(true); setStatus(`${layer}: en curso`);
    if (layer === 'TTS') { audio.current = null; setAudioReady(false); }
    const abort = new AbortController(); request.current = abort;
    const timer = setTimeout(() => abort.abort(), 90000), started = performance.now();
    record(diagnostic(layer, 'REQUEST_STARTED'));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Sesión vigente requerida');
      const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(path, { ...init, headers, signal: abort.signal, credentials: 'same-origin', redirect: 'error' });
      record(diagnostic(layer, 'HTTP_RESPONSE', { status: response.status, elapsedMs: performance.now() - started, code: response.headers.get('X-Keledon-Voice-Error') || undefined }));
      if (!response.ok) throw new Error(`${layer}: HTTP ${response.status}. Revisa sesión, equipo y proveedor.`);
      if (layer === 'TTS') {
        if (response.headers.get('X-Keledon-TTS-Team') !== teamId || !response.headers.get('Content-Type')?.startsWith('audio/')) throw new Error('Respuesta TTS de equipo inválida');
        const bytes = await response.arrayBuffer();
        if (!bytes.byteLength || bytes.byteLength > 8 * 1024 * 1024) throw new Error('Audio TTS fuera de límite');
        if (abort.signal.aborted) return;
        audio.current = bytes; setAudioReady(true); record(diagnostic(layer, 'AUDIO_READY', { bytes: bytes.byteLength }));
      } else {
        const result = await response.json();
        if (abort.signal.aborted) return;
        if (result.teamId !== teamId) throw new Error('El equipo de respuesta no coincide');
        if (layer === 'STT') setTranscript(typeof result.transcript === 'string' ? result.transcript.slice(0, 4000) : '');
        if (layer === 'BRAIN') setReply(typeof result.reply === 'string' ? result.reply.slice(0, 4000) : '');
        if (layer === 'KNOWLEDGE') { record(diagnostic(layer, 'MATCHES_RETURNED', { count: result.count })); setReply(`Conocimiento: ${Number.isSafeInteger(result.count) ? result.count : 0} coincidencias del contexto autorizado. Cero coincidencias no acredita disponibilidad del índice.`); }
      }
      setStatus(`${layer}: respuesta recibida. Confirma el resultado durante la UAT.`);
      record(diagnostic(layer, 'REQUEST_COMPLETED', { elapsedMs: performance.now() - started }));
    } catch (error) {
      if (request.current !== abort) return;
      setStatus(abort.signal.aborted ? 'Operación cancelada o tiempo agotado' : error instanceof Error ? error.message : 'Operación fallida');
      record(diagnostic(layer, abort.signal.aborted ? 'REQUEST_CANCELLED' : 'REQUEST_FAILED', { elapsedMs: performance.now() - started }));
    } finally { clearTimeout(timer); if (request.current === abort) { request.current = null; setBusy(false); onBusy(false); } }
  }
  async function play() {
    if (!audio.current || disabled) return;
    try {
      const encoded = audio.current.slice(0), prior = context.current;
      const owned = new AudioContext(); context.current = owned;
      void prior?.close().catch(() => {}); await owned.resume();
      if (context.current !== owned || owned.state === 'closed') return;
      const buffer = await owned.decodeAudioData(encoded);
      if (context.current !== owned) return;
      const source = owned.createBufferSource(); source.buffer = buffer; source.connect(owned.destination);
      source.onended = () => { record(diagnostic('TTS', 'LOCAL_PLAYBACK_ENDED')); void owned.close().catch(() => {}); if (context.current === owned) context.current = null; };
      source.start(); record(diagnostic('TTS', 'LOCAL_PLAYBACK_STARTED'));
    } catch { setStatus('No se pudo reproducir la muestra'); record(diagnostic('TTS', 'LOCAL_PLAYBACK_FAILED')); }
  }
  const button = 'min-h-11 rounded border border-border px-3 py-2 disabled:opacity-50';
  const locked = busy || disabled || conversationActive || !teamId;
  return <fieldset className="space-y-3 rounded border border-border p-3">
    <legend>Controles por capa · ejecución manual</legend>
    <p>Invocan los proveedores configurados y sus límites de gasto. No se ejecutan automáticamente. Los textos se muestran solo en esta vista.</p>
    <button className={button} disabled={locked} onClick={() => void run('SESSION', `/api/brain/meet/${encodeURIComponent(teamId)}/scope`, {})}>1 · Validar sesión y equipo</button>
    <label className="block">WAV ficticio · PCM mono 16 kHz, 0,1–12 s<input type="file" accept=".wav,audio/wav" disabled={locked} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
    <button className={button} disabled={locked || !file} onClick={() => {
      if (!file || file.size < 3244 || file.size > 384044) { setStatus('Selecciona un WAV de 3244–384044 bytes'); return; }
      const form = new FormData(); form.append('file', file, 'sample.wav');
      void run('STT', `/api/brain/meet/${encodeURIComponent(teamId)}/stt`, { method: 'POST', body: form });
    }}>2 · Transcribir archivo con STT</button>
    {transcript && <p>STT: {transcript}</p>}
    <label className="block">Frase ficticia para Brain y TTS<textarea className="block w-full rounded border border-border bg-background p-2" maxLength={1000} value={text} onChange={e => { setText(e.target.value); audio.current = null; setAudioReady(false); }} /></label>
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={locked || !text.trim()} onClick={() => void run('KNOWLEDGE', `/api/brain/meet/${encodeURIComponent(teamId)}/knowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) })}>3a · Consultar conocimiento del equipo</button>
      <button className={button} disabled={locked || !text.trim()} onClick={() => void run('BRAIN', `/api/brain/meet/${encodeURIComponent(teamId)}/brain`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) })}>3 · Consultar Brain</button>
      <button className={button} disabled={locked || !text.trim()} onClick={() => void run('TTS', '/tts/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId, text }) })}>4 · Generar TTS</button>
      <button className={button} disabled={!audioReady || disabled || conversationActive} onClick={() => void play()}>5 · Reproducir aquí</button>
      <button className={button} disabled={!audioReady || disabled || !conversationActive} onClick={() => { if (audio.current) sendAudio(audio.current.slice(0)); }}>6 · Enviar muestra a Meet</button>
      <button className={button} onClick={() => { request.current?.abort(); void context.current?.close().catch(() => {}); context.current = null; }}>Cancelar capa / detener reproducción local</button>
    </div>
    {reply && <p>Brain: {reply}</p>}
    <p role="status">{status}</p>
  </fieldset>;
}
