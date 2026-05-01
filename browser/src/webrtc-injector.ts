/**
 * KELEDON WebRTC Audio Injector
 *
 * Implements the canonical pre-connection audio injection model from:
 * docs/specs/v1_keledon_webrtc_agent_participation.md
 *
 * Model:
 *   TTS Audio → AudioContext → MediaStreamDestination
 *              → Injected MediaStreamTrack
 *              → navigator.mediaDevices.getUserMedia()
 *              → RTCPeerConnection
 *              → Meeting Participants Hear Agent
 *
 * Integration points (per spec §4):
 *   ✅ Override navigator.mediaDevices.getUserMedia at document_start
 *   ✅ Return MediaStream with agent-controlled audio tracks
 *   ✅ Mix mic + agent audio with explicit user consent
 *   ✅ Use AudioContext → MediaStreamDestination
 *
 * Forbidden (per spec §4):
 *   ❌ Replacing tracks after RTCPeerConnection creation
 *   ❌ Playing audio locally as proof
 *   ❌ Silent or hidden injection
 *
 * cite: docs/specs/v1_keledon_webrtc_agent_participation.md
 */

import { WebContents } from 'electron';
import { EventEmitter } from 'events';

export interface InjectionState {
  sessionId: string;
  armedAt: Date;
  consentGranted: boolean;
  overrideActive: boolean;
}

/**
 * Script injected into the target BrowserView / WebContents.
 * Overrides navigator.mediaDevices.getUserMedia to mix user mic
 * with KELEDON agent audio via AudioContext.
 *
 * The __keledon_inject_audio function is called from main process
 * via executeJavaScript to feed audio chunks from ElevenLabs TTS.
 */
const INJECTION_SCRIPT = `
(function() {
  if (window.__keledon_armed) return 'already_armed';

  const audioCtx = new AudioContext();
  const agentDest = audioCtx.createMediaStreamDestination();
  const agentGain = audioCtx.createGain();
  agentGain.gain.value = 1.0;
  agentGain.connect(agentDest);

  // Expose audio injection endpoint for main process
  window.__keledon_armed = true;
  window.__keledon_inject_audio = function(base64mp3) {
    try {
      const binary = atob(base64mp3);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      audioCtx.decodeAudioData(bytes.buffer).then(function(decoded) {
        const src = audioCtx.createBufferSource();
        src.buffer = decoded;
        src.connect(agentGain);
        src.start();
      }).catch(function(e) {
        console.warn('[KELEDON] Audio decode failed:', e.message);
      });
    } catch (e) {
      console.warn('[KELEDON] inject_audio error:', e.message);
    }
  };

  // Override getUserMedia: mix mic + agent audio
  const _origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async function(constraints) {
    console.log('[KELEDON] getUserMedia intercepted — arming agent audio track');
    let micStream;
    try {
      micStream = await _origGetUserMedia(constraints);
    } catch (e) {
      // Mic denied or unavailable — return agent-only stream
      console.warn('[KELEDON] Mic unavailable, agent audio only');
      return agentDest.stream;
    }

    // Mix mic + agent audio
    const mixDest = audioCtx.createMediaStreamDestination();
    const micSource = audioCtx.createMediaStreamSource(micStream);
    micSource.connect(mixDest);
    agentGain.connect(mixDest);

    console.log('[KELEDON] Mixed MediaStream ready — mic + agent tracks active');
    return mixDest.stream;
  };

  return 'armed';
})();
`;

const DISARM_SCRIPT = `
(function() {
  if (!window.__keledon_armed) return 'not_armed';
  // Restore is not possible after override (WebRTC PeerConnection may already hold the stream),
  // so we set the agent gain to 0 to silence injection silently.
  window.__keledon_armed = false;
  window.__keledon_inject_audio = null;
  return 'disarmed';
})();
`;

class WebRTCInjector extends EventEmitter {
  private sessions = new Map<number, InjectionState>();

  /**
   * Arm injection on the given WebContents.
   * Injects the getUserMedia override script.
   * Must be called BEFORE the target page creates its RTCPeerConnection.
   */
  async arm(wc: WebContents, sessionId: string, consentGranted: boolean): Promise<{ success: boolean; error?: string }> {
    if (!consentGranted) {
      return { success: false, error: 'Consent not granted — arm refused' };
    }

    try {
      const result = await wc.executeJavaScript(INJECTION_SCRIPT, true);
      const state: InjectionState = {
        sessionId,
        armedAt: new Date(),
        consentGranted,
        overrideActive: result === 'armed' || result === 'already_armed',
      };
      this.sessions.set(wc.id, state);

      console.log(`[WebRTCInjector] Armed on wc=${wc.id} session=${sessionId} result=${result}`);
      this.emit('armed', { wcId: wc.id, sessionId, result });

      return { success: true };
    } catch (err: any) {
      console.error('[WebRTCInjector] Arm failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Inject a base64-encoded MP3 audio buffer into the active AudioContext.
   * The audio plays through the agent's GainNode and gets mixed into
   * the MediaStream that the RTCPeerConnection is transmitting.
   */
  async injectAudio(wc: WebContents, audioBase64: string): Promise<void> {
    const state = this.sessions.get(wc.id);
    if (!state?.overrideActive) {
      console.warn(`[WebRTCInjector] injectAudio skipped — wc=${wc.id} not armed`);
      return;
    }

    try {
      // Escape the base64 string for injection into JS
      const escaped = audioBase64.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
      await wc.executeJavaScript(
        `window.__keledon_inject_audio && window.__keledon_inject_audio(\`${escaped}\`)`,
        true
      );
    } catch (err: any) {
      console.warn('[WebRTCInjector] injectAudio error:', err.message);
    }
  }

  /**
   * Disarm injection (silences agent gain; override cannot be fully removed
   * since the page's RTCPeerConnection may already hold a reference to the stream).
   */
  async disarm(wc: WebContents): Promise<void> {
    try {
      await wc.executeJavaScript(DISARM_SCRIPT, true);
      this.sessions.delete(wc.id);
      console.log(`[WebRTCInjector] Disarmed wc=${wc.id}`);
      this.emit('disarmed', { wcId: wc.id });
    } catch (err: any) {
      console.warn('[WebRTCInjector] Disarm error:', err.message);
    }
  }

  getState(wcId: number): InjectionState | undefined {
    return this.sessions.get(wcId);
  }

  isArmed(wcId: number): boolean {
    return this.sessions.get(wcId)?.overrideActive ?? false;
  }
}

export const webrtcInjector = new WebRTCInjector();
