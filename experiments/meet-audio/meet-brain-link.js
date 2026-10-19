/* Explicit opener-bound audio transport. No credentials, provider requests or audio persistence. */
(() => {
  'use strict';
  const ORIGIN = 'https://keledon.tuyoisaza.com';
  const PROTOCOL = 'keledon-meet-v1';
  let requested = false, session = '', authorized = false, active = false;
  let ctx, stream, source, processor, gain, timer, unsubscribe;
  let chunks = [], preRoll = [], utterance = false, hot = 0, quiet = 0, length = 0, turns = 0;
  let generation = 0, playbackGeneration = -1, playing = false;
  let output, inspecting = false;
  const show = text => { if (output) output.textContent = text; };
  const send = data => {
    if (window.opener && !window.opener.closed) window.opener.postMessage({ protocol: PROTOCOL, session, ...data }, ORIGIN);
  };
  function stop(notify = true) {
    active = false; authorized = false; clearTimeout(timer);
    if (processor) { processor.onaudioprocess = null; processor.disconnect(); }
    source?.disconnect(); gain?.disconnect(); stream?.getTracks().forEach(t => t.stop());
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    unsubscribe?.(); unsubscribe = undefined;
    ctx = stream = source = processor = gain = undefined;
    chunks = []; preRoll = []; utterance = false; hot = quiet = length = 0;
    void window.keledonMeetAudio?.release().catch(() => {});
    if (notify) send({ type: 'closed' });
    show('Enlace detenido; audio liberado');
  }
  function wav(parts, rate) {
    const count = parts.reduce((sum, p) => sum + p.length, 0);
    const merged = new Float32Array(count); let at = 0;
    for (const part of parts) { merged.set(part, at); at += part.length; }
    const ratio = rate / 16000, samples = Math.min(192000, Math.floor(count / ratio));
    const bytes = new ArrayBuffer(44 + samples * 2), view = new DataView(bytes);
    const text = (at, value) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
    text(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) { const value = Math.max(-1, Math.min(1, merged[Math.floor(i * ratio)] || 0)); view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true); }
    return bytes;
  }
  function finish() {
    if (!utterance || !ctx) return;
    const audio = wav(chunks, ctx.sampleRate);
    chunks = []; preRoll = []; utterance = false; hot = quiet = length = 0;
    if (audio.byteLength < 3244) return;
    if (++turns > 6) { stop(); return; }
    send({ type: 'turn', generation, audio }); show(`Turno ${turns} enviado a STT/Brain; escuchando interrupciones`);
  }
  async function start() {
    if (!authorized || !session || active || !window.opener || window.opener.closed) return;
    const api = window.keledonMeetAudio;
    if (!api?.subscribe) { show('Recarga la extensión y Meet: adaptador con enlace requerido'); return; }
    try {
      const owned = new AudioContext(); ctx = owned;
      await owned.resume();
      if (ctx !== owned || !authorized) { await owned.close(); return; }
      await api.prepare(); await api.connectOutput();
      if (ctx !== owned || !authorized) return;
      if (!api.snapshot().remoteTracks || !api.snapshot().outgoingTracks) throw new Error('Canales de Meet no listos');
      stream = api.captureRemote();
      source = owned.createMediaStreamSource(stream);
      processor = owned.createScriptProcessor(2048, 1, 1); gain = owned.createGain(); gain.gain.value = 0;
      source.connect(processor); processor.connect(gain); gain.connect(owned.destination);
      active = true; turns = 0;
      generation = api.cancelSpeech(); send({ type: 'interrupt', generation });
      unsubscribe = api.subscribe(state => {
        if (!active) return;
        if (playing && !state.activeSources && state.generation === playbackGeneration) {
          playing = false; send({ type: 'played', generation: playbackGeneration });
        }
      });
      processor.onaudioprocess = event => {
        if (!active || !ctx || window.opener?.closed) { stop(); return; }
        const pcm = event.inputBuffer.getChannelData(0), ms = pcm.length / ctx.sampleRate * 1000;
        let energy = 0; for (const sample of pcm) energy += sample * sample;
        const loud = Math.sqrt(energy / pcm.length) > 0.032;
        hot = loud ? hot + ms : 0;
        if (!utterance) {
          preRoll.push(pcm.slice()); if (preRoll.length > Math.ceil(ctx.sampleRate * 0.25 / pcm.length)) preRoll.shift();
          if (hot < 120) return;
          utterance = true; chunks = preRoll; preRoll = []; length = chunks.reduce((sum, p) => sum + p.length, 0) / ctx.sampleRate * 1000;
          generation = api.cancelSpeech(); playing = false;
          send({ type: 'interrupt', generation }); show('Voz remota detectada; respuesta anterior cancelada');
        } else { chunks.push(pcm.slice()); length += ms; }
        quiet = loud ? 0 : quiet + ms;
        if (quiet >= 800 || length >= 12000) finish();
      };
      timer = setTimeout(() => stop(), 120000);
      show('Audio Brain activo; habla desde el otro dispositivo. Máximo 2 minutos/6 turnos.');
    } catch { send({ type: 'error' }); stop(); show('No se pudo iniciar el audio; confirma reunión y canales'); }
  }
  window.addEventListener('message', event => {
    const d = event.data;
    if (!requested || event.source !== window.opener || event.origin !== ORIGIN || !d || d.protocol !== PROTOCOL) return;
    if (d.type === 'offer' && typeof d.session === 'string' && /^[a-f0-9-]{36}$/.test(d.session)) {
      if (active) stop(false);
      session = d.session; show('Brain enlazado. Autoriza el equipo en Brain, luego inicia audio aquí.'); return;
    }
    if (!session || d.session !== session) return;
    if (d.type === 'inspect') {
      if (inspecting) return;
      inspecting = true;
      const ownSession = session;
      void (async () => {
        try {
          const api = window.keledonMeetAudio;
          const transport = await api?.inspectTransport();
          const state = api?.snapshot();
          if (state && ownSession === session) send({ type: 'diagnostics', state: {
            generation: state.generation, remoteTracks: state.remoteTracks, outgoingTracks: state.outgoingTracks,
            activeSources: state.activeSources, outputBindings: state.outputBindings,
            audioContext: state.audioContext, remoteLevelMilli: Math.round(state.remoteLevel * 1000),
            queuedMs: Math.round(state.queuedAheadSeconds * 1000),
            sentBytes: transport?.bytesSent, receivedBytes: transport?.bytesReceived,
            sentPackets: transport?.packetsSent, receivedPackets: transport?.packetsReceived,
          } });
        } catch { show('No se pudo inspeccionar el transporte; revisa el estado del adaptador'); }
        finally { inspecting = false; }
      })();
    }
    if (d.type === 'cancel' && active) {
      generation = window.keledonMeetAudio.cancelSpeech(); playing = false;
      chunks = []; preRoll = []; utterance = false; hot = quiet = length = 0;
      send({ type: 'interrupt', generation }); show('Respuesta y cola canceladas; esperando voz remota');
    }
    if (d.type === 'activate') { authorized = true; show('Equipo autorizado. Pulsa Iniciar audio Brain con ambos extremos listos.'); }
    if (d.type === 'stop') stop(false);
    if (d.type === 'speech' && active && d.generation === generation && d.generation === window.keledonMeetAudio.snapshot().generation && d.audio instanceof ArrayBuffer && d.audio.byteLength <= 8 * 1024 * 1024) {
      const epoch = generation;
      void window.keledonMeetAudio.sendSpeech(d.audio, epoch).then(ok => {
        if (ok && active && epoch === generation) { playbackGeneration = epoch; playing = true; send({ type: 'started', generation: epoch }); show('Brain está hablando por Meet; puedes interrumpir'); }
      }).catch(() => { send({ type: 'error' }); stop(); });
    }
  });
  window.addEventListener('pagehide', () => stop());
  function mount() {
    const host = document.createElement('aside'); host.style.cssText = 'position:fixed;left:12px;bottom:88px;z-index:2147483646';
    const root = host.attachShadow({ mode: 'open' });
    const panel = document.createElement('section'); panel.setAttribute('aria-label', 'Enlace de conversación Brain');
    panel.style.cssText = 'font:14px system-ui;background:#17202a;color:white;border:2px solid white;border-radius:8px;padding:12px;max-width:300px';
    const title = document.createElement('strong'); title.textContent = 'Meet ↔ Brain · v0.4.0'; panel.append(title);
    for (const [label, action] of [
      ['Conectar con Brain', () => { if (!window.opener) { show('Abre esta reunión desde el panel Meet de Brain'); return; } requested = true; send({ type: 'ready' }); show('Solicitando enlace al Brain que abrió esta ventana'); }],
      ['Iniciar audio Brain', () => { void start(); }], ['Detener audio Brain', () => stop()],
    ]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.style.cssText = 'display:block;min-height:40px;margin-top:8px'; button.onclick = action; panel.append(button); }
    output = document.createElement('p'); output.setAttribute('role', 'status'); output.textContent = 'Sin conexión. No hay grabación persistente ni credenciales en Meet.';
    panel.append(output); root.append(panel); document.body.append(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
