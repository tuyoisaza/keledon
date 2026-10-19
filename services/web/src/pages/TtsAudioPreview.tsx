import { useCallback, useEffect, useRef, useState } from 'react';

type Playback = 'ready' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Decode bytes in memory; never point a media element at a CSP-blocked blob URL. */
export function TtsAudioPreview({ audio }: { audio: Blob | null }) {
  const [sample, setSample] = useState<Blob | null>(audio);
  const [state, setState] = useState<Playback>('ready');
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [sha256, setSha256] = useState('');
  const [error, setError] = useState('');
  const context = useRef<AudioContext | null>(null);
  const buffer = useRef<AudioBuffer | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const offset = useRef(0);
  const startedAt = useRef(0);

  const detachSource = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (source.current) {
      source.current.onended = null;
      try { source.current.stop(); } catch { /* already ended */ }
      source.current.disconnect();
      source.current = null;
    }
  }, []);

  useEffect(() => { setSample(audio); }, [audio]);
  useEffect(() => {
    generation.current++;
    detachSource();
    const previous = context.current;
    context.current = null;
    if (previous && previous.state !== 'closed') void previous.close().catch(() => {});
    buffer.current = null;
    offset.current = 0;
    setState('ready'); setDuration(0); setPosition(0); setCompleted(0); setSha256(''); setError('');
    return () => {
      generation.current++;
      detachSource();
      const owned = context.current;
      context.current = null;
      if (owned && owned.state !== 'closed') void owned.close().catch(() => {});
    };
  }, [sample, detachSource]);

  async function play() {
    if (!sample || state === 'loading' || state === 'playing') return;
    const epoch = ++generation.current;
    setState('loading'); setError('');
    try {
      if (!sample.size || sample.size > 8 * 1024 * 1024)
        throw new Error('La muestra debe contener audio y no superar 8 MiB.');
      const AudioContextConstructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!AudioContextConstructor) throw new Error('Web Audio no está disponible en este navegador.');
      const ctx = context.current && context.current.state !== 'closed' ? context.current : new AudioContextConstructor();
      context.current = ctx;
      // Resume directly from the user's click, before awaiting file decoding.
      await ctx.resume();
      if (!buffer.current) {
        const bytes = await sample.arrayBuffer();
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        const decoded = await ctx.decodeAudioData(bytes);
        if (epoch !== generation.current || context.current !== ctx) return;
        if (!Number.isFinite(decoded.duration) || decoded.duration <= 0 || decoded.duration > 60)
          throw new Error('La muestra debe ser audio válido de hasta 60 segundos.');
        buffer.current = decoded;
        setDuration(decoded.duration);
        setSha256(Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join(''));
      }
      if (epoch !== generation.current || context.current !== ctx) return;
      const decoded = buffer.current;
      if (!decoded) throw new Error('No se pudo decodificar la muestra de audio.');
      const node = ctx.createBufferSource();
      node.buffer = decoded;
      node.connect(ctx.destination);
      source.current = node;
      const start = Math.min(offset.current, decoded.duration);
      startedAt.current = ctx.currentTime;
      node.onended = () => {
        if (source.current !== node || epoch !== generation.current) return;
        source.current = null;
        node.disconnect();
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
        offset.current = 0;
        setPosition(decoded.duration); setState('ended'); setCompleted(value => value + 1);
        void ctx.suspend().catch(() => {});
      };
      const update = () => {
        if (source.current !== node || epoch !== generation.current) return;
        setPosition(Math.min(decoded.duration, start + ctx.currentTime - startedAt.current));
        frame.current = requestAnimationFrame(update);
      };
      node.start(0, start);
      setState('playing');
      update();
    } catch (cause) {
      if (epoch !== generation.current) return;
      detachSource();
      setState('error');
      setError(cause instanceof Error ? cause.message : 'No se pudo reproducir la muestra.');
      const ctx = context.current;
      if (ctx?.state === 'running') void ctx.suspend().catch(() => {});
    }
  }

  function pause() {
    if (state !== 'playing' || !context.current) return;
    offset.current = Math.min(duration, offset.current + context.current.currentTime - startedAt.current);
    generation.current++;
    detachSource();
    setPosition(offset.current); setState('paused');
    void context.current.suspend().catch(() => {});
  }

  function stop() {
    generation.current++;
    detachSource();
    offset.current = 0;
    setPosition(0); setState('ready'); setError('');
    if (context.current?.state === 'running') void context.current.suspend().catch(() => {});
  }

  const labels: Record<Playback, string> = {
    ready: sample ? 'Muestra lista' : 'Selecciona una muestra de audio', loading: 'Decodificando muestra…',
    playing: 'Reproduciendo muestra', paused: 'Reproducción pausada', ended: 'Reproducción completada', error: 'Error de reproducción',
  };
  const button = 'min-h-11 rounded border border-border px-4 py-2 disabled:opacity-50';
  return <section className="space-y-3 rounded border border-border p-3" aria-label="Vista previa de audio TTS">
    <h3 className="font-medium">Vista previa de la muestra española</h3>
    <label className="block text-sm">Abrir muestra TTS ya generada
      <input type="file" accept="audio/*" className="mt-2 block w-full" onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) setSample(file);
      }} />
    </label>
    <p className="text-sm text-muted-foreground">Reproduce únicamente los bytes de la muestra. Abrir un archivo no lo sube al servidor ni llama al proveedor.</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" className={button} disabled={!sample || state === 'loading' || state === 'playing'} onClick={() => void play()}>
        {state === 'paused' ? 'Continuar muestra' : state === 'ended' ? 'Repetir muestra' : 'Reproducir muestra'}
      </button>
      <button type="button" className={button} disabled={state !== 'playing'} onClick={pause}>Pausar muestra</button>
      <button type="button" className={button} disabled={!sample || state === 'ready'} onClick={stop}>Detener muestra</button>
    </div>
    <progress className="w-full" aria-label="Progreso de reproducción TTS" max={duration || 1} value={position} />
    <p role="status">{labels[state]} · {position.toFixed(2)} / {duration.toFixed(2)} s</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <output className="block break-all text-xs" aria-label="Evidencia de reproducción TTS">{JSON.stringify({
      engine: 'Web Audio', state, durationSeconds: duration, positionSeconds: position,
      completedPlaybacks: completed, sha256,
    })}</output>
  </section>;
}
