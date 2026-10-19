/* Experimental MAIN-world adapter. No credentials, network, transcript or audio persistence.
 * Load before joining. Explicit arm replaces requested audio with generated audio;
 * it never falls back to a physical microphone or mixes microphone into remote input.
 */
(() => {
  'use strict';
  if (window.top !== window || window.keledonMeetAudio) return;
  const devices = navigator.mediaDevices;
  if (!devices || !window.RTCPeerConnection) return;
  const originalGetUserMedia = devices.getUserMedia;
  const OriginalPeer = window.RTCPeerConnection;
  const peers = new Set();
  const remoteTracks = new Map();
  const sources = new Set();
  let context, destination, processor, remoteMix, remoteDestination, silentGain;
  let armed = false;
  let generation = 0;
  let nextStart = 0;
  let pending = Promise.resolve();
  let hotMs = 0;
  let interrupts = 0;
  let outputRequests = 0;
  let outputBindings = 0;
  let lastLevel = 0;
  let lastReportAt = 0;
  let transport = null;
  let lastDecoded = null;
  let status = 'DISARMED';
  let outputClones = new Set();
  const captureClones = new Set();
  const listeners = new Set();
  const diagnostics = [];
  function logEvent(event, fields = {}) {
    diagnostics.push({ at: new Date().toISOString(), event, ...fields });
    if (diagnostics.length > 80) diagnostics.shift();
  }
  const snapshot = () => ({
    status, armed, remoteTracks: remoteTracks.size,
    outgoingTracks: [...outputClones].filter(t => t.readyState === 'live').length,
    outputRequests, outputBindings, generation, activeSources: sources.size, interrupts,
    remoteLevel: lastLevel, audioContext: context?.state || 'absent',
    queuedAheadSeconds: context ? Math.max(0, nextStart - context.currentTime) : 0,
    outputTrackStates: [...outputClones].map(track => ({ enabled: track.enabled, muted: track.muted, state: track.readyState })),
    lastDecoded, transport, remoteAcceptance: 'NOT_RUN',
  });
  const report = () => { for (const fn of listeners) fn(snapshot()); };
  function cancelSpeech(reason = 'manual') {
    generation++;
    pending = Promise.resolve();
    for (const source of sources) {
      source.onended = null;
      try { source.stop(); } catch { /* already ended */ }
      source.disconnect();
    }
    sources.clear();
    nextStart = context?.currentTime || 0;
    hotMs = 0;
    if (reason === 'remote-speech') interrupts++;
    logEvent('speech-cancelled', { reason: reason === 'remote-speech' ? 'remote-speech' : reason === 'release' ? 'release' : 'manual', generation });
    report();
    return generation;
  }
  function observeTrack(track) {
    if (!armed || track.kind !== 'audio' || track.readyState !== 'live' || remoteTracks.has(track)) return;
    const input = context.createMediaStreamSource(new MediaStream([track]));
    input.connect(remoteMix);
    const remove = () => { input.disconnect(); remoteTracks.delete(track); report(); };
    remoteTracks.set(track, { input, remove });
    track.addEventListener('ended', remove, { once: true });
    report();
  }
  function inspectPeer(peer) {
    if (!armed) return;
    for (const receiver of peer.getReceivers()) if (receiver.track) observeTrack(receiver.track);
  }
  // Construct through the native constructor, retaining native prototype/static members.
  const WrappedPeer = new Proxy(OriginalPeer, {
    construct(target, args, newTarget) {
      const peer = Reflect.construct(target, args, newTarget);
      peers.add(peer);
      peer.addEventListener('track', event => observeTrack(event.track));
      peer.addEventListener('connectionstatechange', () => {
        if (peer.connectionState === 'closed') peers.delete(peer);
      });
      return peer;
    },
  });
  window.RTCPeerConnection = WrappedPeer;
  const wrappedGetUserMedia = async function(constraints) {
    if (!armed || !constraints?.audio) return originalGetUserMedia.call(devices, constraints);
    const epoch = generation;
    // Preserve video constraints and native permission failures; never catch a denial as success.
    const video = constraints.video
      ? await originalGetUserMedia.call(devices, { audio: false, video: constraints.video })
      : new MediaStream();
    if (!armed || epoch !== generation) {
      video.getTracks().forEach(t => t.stop());
      throw new DOMException('Audio session changed', 'AbortError');
    }
    const track = destination.stream.getAudioTracks()[0].clone();
    outputClones.add(track);
    track.addEventListener('ended', () => { outputClones.delete(track); report(); }, { once: true });
    outputRequests++;
    logEvent('output-track-supplied', { generation });
    status = 'OUTPUT_TRACK_SUPPLIED_UNVERIFIED';
    report();
    return new MediaStream([...video.getVideoTracks(), track]);
  };
  devices.getUserMedia = wrappedGetUserMedia;
  async function prepare() {
    if (armed) return snapshot();
    if (context) throw new Error('Audio preparation is already in progress');
    const ownerContext = new AudioContext();
    context = ownerContext;
    const epoch = ++generation;
    try {
      await ownerContext.resume();
      if (context !== ownerContext || generation !== epoch)
        throw new DOMException('Audio session changed', 'AbortError');
      if (context.state !== 'running') throw new Error('Audio context is not running');
      // Scheduling times belong to this context's clock, never to a closed one.
      // Release/cancellation may have saved the old context's much larger time.
      nextStart = ownerContext.currentTime;
      pending = Promise.resolve();
      hotMs = 0;
      lastLevel = 0;
      lastDecoded = null;
      transport = null;
      destination = context.createMediaStreamDestination();
      remoteMix = context.createGain();
      remoteDestination = context.createMediaStreamDestination();
      remoteMix.connect(remoteDestination);
      processor = context.createScriptProcessor(2048, 1, 1);
      silentGain = context.createGain();
      silentGain.gain.value = 0;
      remoteMix.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(context.destination);
      processor.onaudioprocess = event => {
        if (!armed) return;
        const samples = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        lastLevel = Math.sqrt(sum / samples.length);
        // Remote input remains active while generated output plays. No microphone monitor.
        hotMs = lastLevel > 0.032 ? hotMs + samples.length / context.sampleRate * 1000 : 0;
        if (sources.size && hotMs >= 120) cancelSpeech('remote-speech');
        if (performance.now() - lastReportAt >= 1000) {
          lastReportAt = performance.now();
          report();
        }
      };
      armed = true;
      status = 'ARMED_JOIN_OR_RESELECT_MIC';
      logEvent('armed', { generation });
      for (const peer of peers) inspectPeer(peer);
      report();
      return snapshot();
    } catch (error) {
      if (ownerContext.state !== 'closed') await ownerContext.close();
      if (context === ownerContext) {
        context = undefined;
        armed = false;
      }
      throw error;
    }
  }
  // Stream for STT integration; contains only RTCRtpReceiver audio, never TTS/mic.
  // Returning a clone prevents a consumer stopping the adapter's own destination.
  function captureRemote() {
    if (!armed || !remoteTracks.size) throw new Error('No observed remote audio track');
    const stream = remoteDestination.stream.clone();
    for (const track of stream.getTracks()) {
      captureClones.add(track);
      track.addEventListener('ended', () => captureClones.delete(track), { once: true });
    }
    return stream;
  }
  // Explicit experimental fallback: real Meet retained a pre-arm input track.
  // Replace only audio senders observed in this document. Never restore a physical
  // microphone automatically; release leaves these senders silent until reselected.
  async function connectOutput() {
    if (!armed || context?.state !== 'running') throw new Error('Arm audio first');
    const epoch = generation;
    const ownerDestination = destination;
    let bound = 0;
    for (const peer of peers) {
      if (!['connected', 'connecting'].includes(peer.connectionState)) continue;
      for (const sender of peer.getSenders()) {
        if (!armed || epoch !== generation || destination !== ownerDestination) return bound;
        if (sender.track?.kind !== 'audio') continue;
        if (outputClones.has(sender.track)) { bound++; continue; }
        const previous = sender.track;
        const generated = ownerDestination.stream.getAudioTracks()[0].clone();
        try {
          await sender.replaceTrack(generated);
          if (!armed || epoch !== generation || destination !== ownerDestination) {
            await sender.replaceTrack(null);
            generated.stop();
            return bound;
          }
          previous.enabled = false;
          outputClones.add(generated);
          bound++;
          outputBindings++;
          logEvent('output-sender-bound', { generation });
        } catch {
          generated.stop();
          logEvent('output-binding-failed');
          throw new Error('Audio sender binding failed');
        }
      }
    }
    status = bound ? 'OUTPUT_SENDER_BOUND_UNVERIFIED' : 'NO_AUDIO_SENDER_OBSERVED';
    report();
    return bound;
  }
  // Bounded, explicitly requested RTP counters. No endpoints, SDP, device IDs or URLs.
  // Counters prove transport activity only; the remote participant still accepts speech.
  async function inspectTransport() {
    const epoch = generation;
    const deadline = performance.now() + 5000;
    const result = {
      matchedOutputSenders: 0, bytesSent: 0, packetsSent: 0,
      remoteReceivers: 0, bytesReceived: 0, packetsReceived: 0,
      outputMediaSources: [],
      failedReads: 0, measuredAt: new Date().toISOString(),
    };
    for (const peer of peers) {
      if (!armed || generation !== epoch) return null;
      if (performance.now() >= deadline) { result.failedReads++; break; }
      for (const sender of peer.getSenders()) {
        if (performance.now() >= deadline) { result.failedReads++; break; }
        if (!outputClones.has(sender.track)) continue;
        result.matchedOutputSenders++;
        try {
          const stats = await Promise.race([
            sender.getStats(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Stats timeout')), Math.min(1500, Math.max(1, deadline - performance.now())))),
          ]);
          stats.forEach(stat => {
            if (stat.type !== 'outbound-rtp' || stat.isRemote) return;
            result.bytesSent += stat.bytesSent || 0;
            result.packetsSent += stat.packetsSent || 0;
          });
          stats.forEach(stat => {
            if (stat.type !== 'media-source' || stat.kind !== 'audio') return;
            result.outputMediaSources.push({
              audioLevel: stat.audioLevel ?? null,
              totalAudioEnergy: stat.totalAudioEnergy ?? null,
              totalSamplesDuration: stat.totalSamplesDuration ?? null,
            });
          });
        } catch { result.failedReads++; }
      }
      for (const receiver of peer.getReceivers()) {
        if (performance.now() >= deadline) { result.failedReads++; break; }
        if (!remoteTracks.has(receiver.track)) continue;
        result.remoteReceivers++;
        try {
          const stats = await Promise.race([
            receiver.getStats(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Stats timeout')), Math.min(1500, Math.max(1, deadline - performance.now())))),
          ]);
          stats.forEach(stat => {
            if (stat.type !== 'inbound-rtp') return;
            result.bytesReceived += stat.bytesReceived || 0;
            result.packetsReceived += stat.packetsReceived || 0;
          });
        } catch { result.failedReads++; }
      }
    }
    if (!armed || generation !== epoch) return null;
    transport = result;
    logEvent('transport-measured', { matchedOutputSenders: result.matchedOutputSenders, remoteReceivers: result.remoteReceivers, failedReads: result.failedReads });
    report();
    return result;
  }
  // turnGeneration is mandatory: decodes queued before interrupt/release can never restart speech.
  function sendSpeech(encodedAudio, turnGeneration) {
    if (!armed || turnGeneration !== generation) return Promise.resolve(false);
    if (!(encodedAudio instanceof ArrayBuffer) || encodedAudio.byteLength > 8 * 1024 * 1024)
      return Promise.reject(new Error('Expected an audio buffer up to 8 MiB'));
    const ownerContext = context;
    const job = pending.then(async () => {
      if (!armed || generation !== turnGeneration || context !== ownerContext) return false;
      const buffer = await ownerContext.decodeAudioData(encodedAudio.slice(0));
      if (!armed || generation !== turnGeneration || context !== ownerContext) return false;
      let energy = 0;
      let count = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const samples = buffer.getChannelData(channel);
        for (let i = 0; i < samples.length; i += 64) { energy += samples[i] * samples[i]; count++; }
      }
      lastDecoded = { duration: buffer.duration, channels: buffer.numberOfChannels, sampleRate: buffer.sampleRate, sampledRms: Math.sqrt(energy / Math.max(1, count)) };
      logEvent('speech-decoded', lastDecoded);
      if (buffer.duration > 60 || Math.max(ownerContext.currentTime, nextStart) + buffer.duration - ownerContext.currentTime > 60)
        throw new Error('Speech queue exceeds 60 seconds');
      const source = ownerContext.createBufferSource();
      source.buffer = buffer;
      source.connect(destination); // Deliberately no local-speaker output.
      sources.add(source);
      source.onended = () => { source.disconnect(); sources.delete(source); logEvent('speech-ended', { generation: turnGeneration }); report(); };
      const start = Math.max(ownerContext.currentTime, nextStart);
      nextStart = start + buffer.duration;
      source.start(start);
      logEvent('speech-started', { generation: turnGeneration, contextState: ownerContext.state });
      report();
      return true;
    });
    pending = job.catch(() => {});
    return job;
  }
  async function release() {
    armed = false;
    cancelSpeech('release');
    for (const [track, item] of remoteTracks) {
      track.removeEventListener('ended', item.remove);
      item.input.disconnect(); // Receiver tracks belong to Meet; do not stop them.
    }
    remoteTracks.clear();
    for (const track of outputClones) track.stop();
    outputClones.clear();
    for (const track of captureClones) track.stop();
    captureClones.clear();
    destination?.stream.getTracks().forEach(t => t.stop());
    remoteDestination?.stream.getTracks().forEach(t => t.stop());
    if (processor) { processor.onaudioprocess = null; processor.disconnect(); }
    remoteMix?.disconnect();
    silentGain?.disconnect();
    const closing = context;
    context = undefined;
    await closing?.close();
    if (!armed && !context) {
      outputRequests = 0;
      outputBindings = 0;
      transport = null;
      lastDecoded = null;
      nextStart = 0;
      status = 'RELEASED_RESELECT_MEET_MIC';
    }
    report();
  }
  async function copyLogs() {
    // Only allowlisted diagnostic fields: never arbitrary Error.message/stack,
    // browser console, track labels, URLs, filenames, transcripts or audio.
    const payload = JSON.stringify({
      kind: 'KELEDON_MEET_AUDIO_DIAGNOSTICS', version: '0.2.1',
      copiedAt: new Date().toISOString(), state: snapshot(), events: diagnostics,
    }, null, 2);
    await navigator.clipboard.writeText(payload);
  }
  const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
  window.keledonMeetAudio = Object.freeze({ prepare, captureRemote, sendSpeech, cancelSpeech, release, snapshot, inspectTransport, connectOutput, subscribe });
  window.addEventListener('pagehide', () => { void release(); }, { once: true });
  function mount() {
    const host = document.createElement('aside');
    const root = host.attachShadow({ mode: 'open' });
    host.style.cssText = 'position:fixed;bottom:90px;right:16px;z-index:2147483647';
    // MAIN-world execution inherits the site's Trusted Types policy. Construct
    // nodes directly; never create a Trusted Types policy or weaken page CSP.
    const style = document.createElement('style');
    style.textContent = ':host{font:14px system-ui;color:#fff}section{background:#17202a;padding:12px;border:2px solid #fff;border-radius:8px;max-width:320px}button,input{margin:6px 0;min-height:36px}pre{white-space:pre-wrap;font-size:12px;max-height:240px;overflow:auto}';
    const panel = document.createElement('section');
    panel.setAttribute('aria-label', 'KELEDON audio experiment');
    const heading = document.createElement('strong');
    heading.textContent = 'KELEDON · audio experimental v0.2.1';
    const description = document.createElement('p');
    description.textContent = 'Armar antes de entrar. Micrófono físico excluido. Sin grabación ni conexión al Brain.';
    panel.append(heading, description);
    for (const [id, label] of [['arm', 'Armar audio'], ['bind', 'Conectar salida'], ['stop', 'Interrumpir'], ['release', 'Liberar'], ['stats', 'Medir transporte'], ['logs', 'Copiar logs']]) {
      const button = document.createElement('button');
      button.id = id;
      button.type = 'button';
      button.textContent = label;
      panel.append(button, document.createTextNode(' '));
    }
    const label = document.createElement('label');
    label.textContent = 'Audio hablado de prueba (máx. 8 MiB)';
    const fileInput = document.createElement('input');
    fileInput.id = 'file';
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    label.append(fileInput);
    const statusOutput = document.createElement('pre');
    statusOutput.id = 'status';
    statusOutput.setAttribute('role', 'status');
    panel.append(label, statusOutput);
    root.append(style, panel);
    const output = root.getElementById('status');
    const update = value => { output.textContent = JSON.stringify(value, null, 2); };
    const failure = () => {
      logEvent('audio-operation-failed');
      output.textContent = 'ERROR: operación de audio fallida; no se demuestra audio remoto.';
    };
    listeners.add(update);
    update(snapshot());
    root.getElementById('arm').onclick = () => { void prepare().catch(failure); };
    root.getElementById('bind').onclick = async event => {
      const button = event.target;
      button.disabled = true;
      try { await connectOutput(); } catch { failure(); }
      finally { button.disabled = false; }
    };
    root.getElementById('stop').onclick = () => cancelSpeech();
    root.getElementById('release').onclick = () => { void release().catch(failure); };
    root.getElementById('logs').onclick = async event => {
      const button = event.target;
      try { await copyLogs(); button.textContent = 'Logs copiados'; }
      catch { button.textContent = 'No se pudo copiar'; }
      setTimeout(() => { button.textContent = 'Copiar logs'; }, 2000);
    };
    root.getElementById('stats').onclick = async event => {
      const button = event.target;
      button.disabled = true;
      try { await inspectTransport(); } catch { failure(); }
      finally { button.disabled = false; }
    };
    root.getElementById('file').onchange = async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file || !armed || file.size > 8 * 1024 * 1024) return failure();
      const epoch = generation;
      try { await sendSpeech(await file.arrayBuffer(), epoch); } catch { failure(); }
    };
    document.body.append(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
