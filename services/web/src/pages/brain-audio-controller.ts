import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Socket } from 'socket.io-client';

type BrainAudioScope = {
  bargeInActiveRef: RefObject<boolean>;
  bargeInProcessorRef: RefObject<ScriptProcessorNode | null>;
  bargeInContextRef: RefObject<AudioContext | null>;
  bargeInStreamRef: RefObject<MediaStream | null>;
  conversationModeRef: RefObject<boolean>;
  listeningRef: RefObject<boolean>;
  selectedMicId: string;
  ttsPlaybackActiveRef: RefObject<boolean>;
  addLog: (msg: string) => void;
  audioQueueRef: RefObject<{ data: string; seq: string; format?: string | undefined; }[]>;
  voiceSocketRef: RefObject<Socket | null>;
  startSpeachesListening: () => Promise<void>;
  setSpeakingMessageId: Dispatch<SetStateAction<string | null>>;
  postPlaybackEchoGuardUntilRef: RefObject<number>;
  ttsAbortRef: RefObject<AbortController | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  webAudioSourceRef: RefObject<AudioBufferSourceNode | null>;
  webAudioContextRef: RefObject<AudioContext | null>;
  selectedSpeakerId: string;
};

type WindowWithWebkitAudioContext = Window & { webkitAudioContext?: typeof AudioContext };

function getAudioContextConstructor(): typeof AudioContext | undefined {
  const audioWindow = window as WindowWithWebkitAudioContext;
  return window.AudioContext ?? audioWindow.webkitAudioContext;
}

export function createBrainAudioController(scope: BrainAudioScope) {
function stopBargeInMonitor() {
    scope.bargeInActiveRef.current = false;
    try {
      scope.bargeInProcessorRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      scope.bargeInContextRef.current?.close();
    } catch {
      /* ignore */
    }
    scope.bargeInStreamRef.current?.getTracks().forEach((t) => t.stop());
    scope.bargeInProcessorRef.current = null;
    scope.bargeInContextRef.current = null;
    scope.bargeInStreamRef.current = null;
  }

async function startBargeInMonitor(label: string) {
    if (
      !scope.conversationModeRef.current ||
      scope.listeningRef.current ||
      scope.bargeInActiveRef.current
    )
      return;
    scope.bargeInActiveRef.current = true;
    try {
      const AudioContextCtor = getAudioContextConstructor();
      if (!AudioContextCtor) throw new Error("AudioContext unavailable");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: scope.selectedMicId ? { deviceId: { exact: scope.selectedMicId } } : true,
      });
      if (!scope.ttsPlaybackActiveRef.current || scope.listeningRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        scope.bargeInActiveRef.current = false;
        return;
      }
      const ctx = new AudioContextCtor();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(1024, 1, 1);
      let hotFrames = 0;
      let elapsedMs = 0;
      let lastLog = 0;
      const threshold = 0.032;
      const framesToTrigger = 3;
      processor.onaudioprocess = (event) => {
        if (
          !scope.bargeInActiveRef.current ||
          !scope.ttsPlaybackActiveRef.current ||
          scope.listeningRef.current
        )
          return;
        const input = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / Math.max(1, input.length));
        const frameMs = (input.length / ctx.sampleRate) * 1000;
        elapsedMs += frameMs;
        hotFrames = rms > threshold ? hotFrames + 1 : 0;
        if (elapsedMs - lastLog > 1200) {
          lastLog = elapsedMs;
          scope.addLog(
            `[BARGE-IN] monitoring during ${label}… level=${rms.toFixed(3)} hot=${hotFrames}`,
          );
        }
        if (hotFrames >= framesToTrigger && elapsedMs > 250) {
          scope.addLog(
            `[BARGE-IN] user speech detected during ${label} → interrupting TTS (level=${rms.toFixed(3)})`,
          );
          stopBargeInMonitor();
          scope.audioQueueRef.current = [];
          scope.voiceSocketRef.current?.emit("voice:interrupt");
          stopSpeaking();
          setTimeout(() => {
            if (scope.conversationModeRef.current && !scope.listeningRef.current)
              void scope.startSpeachesListening();
          }, 80);
        }
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      scope.bargeInStreamRef.current = stream;
      scope.bargeInContextRef.current = ctx;
      scope.bargeInProcessorRef.current = processor;
      scope.addLog(`[BARGE-IN] monitor armed during ${label}`);
    } catch (err) {
      scope.bargeInActiveRef.current = false;
      scope.addLog(
        `[BARGE-IN] monitor unavailable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

function markTtsPlaybackStarted(label: string) {
    scope.ttsPlaybackActiveRef.current = true;
    scope.setSpeakingMessageId((prev) => prev || `voice-${Date.now()}`);
    void startBargeInMonitor(label);
  }

function markTtsPlaybackEnded() {
    scope.ttsPlaybackActiveRef.current = false;
    scope.postPlaybackEchoGuardUntilRef.current = Date.now() + 700;
    stopBargeInMonitor();
    scope.setSpeakingMessageId(null);
  }

function stopSpeaking() {
    scope.ttsPlaybackActiveRef.current = false;
    stopBargeInMonitor();
    scope.ttsAbortRef.current?.abort();
    scope.ttsAbortRef.current = null;
    if (scope.audioRef.current) {
      scope.audioRef.current.pause();
      scope.audioRef.current = null;
    }
    if (scope.webAudioSourceRef.current) {
      try {
        scope.webAudioSourceRef.current.stop();
      } catch {
        /* ignore */
      }
      scope.webAudioSourceRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    scope.setSpeakingMessageId(null);
  }

async function playWavPcmViaWebAudio(
    bytes: Uint8Array,
    label: string,
    onEnded: () => void,
  ): Promise<boolean> {
    try {
      if (bytes.length < 44) return false;
      const ascii = (start: number, end: number) =>
        String.fromCharCode(...bytes.slice(start, end));
      if (ascii(0, 4) !== "RIFF" || ascii(8, 12) !== "WAVE") return false;
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      let pos = 12;
      let audioFormat = 0;
      let channels = 0;
      let sampleRate = 0;
      let bitsPerSample = 0;
      let dataStart = 0;
      let dataSize = 0;
      while (pos + 8 <= bytes.length) {
        const id = ascii(pos, pos + 4);
        const declaredSize = view.getUint32(pos + 4, true);
        const payloadStart = pos + 8;
        const remaining = Math.max(0, bytes.length - payloadStart);
        const chunkSize =
          declaredSize === 0xffffffff || declaredSize > remaining
            ? remaining
            : declaredSize;
        if (id === "fmt " && chunkSize >= 16) {
          audioFormat = view.getUint16(payloadStart, true);
          channels = view.getUint16(payloadStart + 2, true);
          sampleRate = view.getUint32(payloadStart + 4, true);
          bitsPerSample = view.getUint16(payloadStart + 14, true);
        } else if (id === "data") {
          dataStart = payloadStart;
          dataSize = chunkSize;
          break;
        }
        pos = payloadStart + chunkSize + (chunkSize % 2);
      }
      if (
        audioFormat !== 1 ||
        channels < 1 ||
        sampleRate < 8000 ||
        bitsPerSample !== 16 ||
        dataStart <= 0 ||
        dataSize <= 0
      ) {
        scope.addLog(
          `[${label}] WebAudio WAV parser unsupported fmt=${audioFormat} channels=${channels} rate=${sampleRate} bits=${bitsPerSample} data=${dataSize}`,
        );
        return false;
      }
      const sampleCount = Math.floor(dataSize / 2 / channels);
      const AudioContextCtor = getAudioContextConstructor();
      if (!AudioContextCtor) return false;
      const ctx = scope.webAudioContextRef.current || new AudioContextCtor();
      scope.webAudioContextRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      const buffer = ctx.createBuffer(channels, sampleCount, sampleRate);
      let offset = dataStart;
      for (let i = 0; i < sampleCount; i++) {
        for (let ch = 0; ch < channels; ch++) {
          const sample = view.getInt16(offset, true) / 32768;
          buffer.getChannelData(ch)[i] = sample;
          offset += 2;
        }
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      scope.webAudioSourceRef.current = source;
      source.onended = () => {
        if (scope.webAudioSourceRef.current === source)
          scope.webAudioSourceRef.current = null;
        scope.addLog(`[${label}] WebAudio WAV playback ended`);
        markTtsPlaybackEnded();
        onEnded();
      };
      scope.addLog(
        `[${label}] WebAudio WAV playback start channels=${channels} rate=${sampleRate} samples=${sampleCount}`,
      );
      markTtsPlaybackStarted(label);
      source.start();
      return true;
    } catch (err) {
      scope.addLog(
        `[${label}] WebAudio WAV playback failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

async function playMp3ViaWebAudio(
    bytes: Uint8Array,
    label: string,
    onEnded: () => void,
  ): Promise<boolean> {
    try {
      const AudioContextCtor = getAudioContextConstructor();
      if (!AudioContextCtor) return false;
      const ctx = scope.webAudioContextRef.current || new AudioContextCtor();
      scope.webAudioContextRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      const arrayBuf = new Uint8Array(bytes).buffer;
      return new Promise<boolean>((resolve) => {
        ctx.decodeAudioData(
          arrayBuf,
          (audioBuffer) => {
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            scope.webAudioSourceRef.current = source;
            source.onended = () => {
              if (scope.webAudioSourceRef.current === source)
                scope.webAudioSourceRef.current = null;
              scope.addLog(`[${label}] WebAudio MP3 playback ended`);
              markTtsPlaybackEnded();
              onEnded();
            };
            scope.addLog(
              `[${label}] WebAudio MP3 playback start duration=${audioBuffer.duration.toFixed(2)}s`,
            );
            markTtsPlaybackStarted(label);
            source.start();
            resolve(true);
          },
          () => {
            resolve(false);
          },
        );
      });
    } catch {
      return false;
    }
  }

function playBlobViaAudioElement(
    blob: Blob,
    label: string,
    onEnded: () => void,
    onFailed: () => void,
  ) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    scope.audioRef.current = audio;
    if (audio.setSinkId && scope.selectedSpeakerId) {
      audio.setSinkId(scope.selectedSpeakerId).catch(() => {});
    }
    audio.onended = () => {
      scope.addLog(`[${label}] Audio element playback ended`);
      markTtsPlaybackEnded();
      URL.revokeObjectURL(url);
      onEnded();
    };
    audio.onerror = () => {
      scope.addLog(`[${label}] Audio element playback error`);
      markTtsPlaybackEnded();
      URL.revokeObjectURL(url);
      onFailed();
    };
    markTtsPlaybackStarted(label);
    void audio.play().catch((err) => {
      scope.addLog(
        `[${label}] Audio element play() rejected: ${err instanceof Error ? err.message : String(err)}`,
      );
      markTtsPlaybackEnded();
      URL.revokeObjectURL(url);
      onFailed();
    });
  }

async function playAudioBytes(
    bytes: Uint8Array,
    mimeType: string,
    label: string,
    onEnded: () => void,
    onFailed: () => void,
  ) {
    const isWav =
      mimeType.includes("wav") ||
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF";
    if (isWav && (await playWavPcmViaWebAudio(bytes, label, onEnded))) return;
    // Try MP3 via WebAudio API (decodeAudioData)
    if (await playMp3ViaWebAudio(bytes, label, onEnded)) return;
    // Fallback: Audio element with blob URL
    const audioCopy: ArrayBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(audioCopy).set(bytes);
    playBlobViaAudioElement(
      new Blob([audioCopy], { type: mimeType }),
      label,
      onEnded,
      onFailed,
    );
  }

  return { stopBargeInMonitor, stopSpeaking, playAudioBytes };
}
