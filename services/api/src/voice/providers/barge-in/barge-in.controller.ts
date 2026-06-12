import { Logger } from '@nestjs/common';

/**
 * BargeInController — manages interruption of TTS playback.
 *
 * When the user speaks while the agent is speaking, this controller:
 * 1. Stops current TTS stream
 * 2. Clears the playback queue
 * 3. Records the interruption event
 * 4. Signals the provider to start a new turn
 */
export class BargeInController {
  readonly id = 'barge-in';
  private readonly logger = new Logger(BargeInController.name);

  private _isSpeaking = false;
  private onInterruptListeners: Array<() => void> = [];
  private sessions = new Set<string>();

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /** Mark that TTS playback has started for a session */
  startSpeaking(sessionId: string): void {
    this._isSpeaking = true;
    this.sessions.add(sessionId);
    this.logger.debug(`[barge-in] TTS started session=${sessionId}`);
  }

  /** Mark that TTS playback has ended normally */
  endSpeaking(sessionId: string): void {
    if (!this._isSpeaking) return;
    this._isSpeaking = false;
    this.sessions.delete(sessionId);
    this.logger.debug(`[barge-in] TTS ended session=${sessionId}`);
  }

  /**
   * Called when VAD detects user speech during TTS playback.
   * Fires all interrupt listeners (typically: stop TTS, clear queue, log event).
   */
  triggerInterrupt(reason: string, sessionId?: string): void {
    if (!this._isSpeaking) return; // no-op if not speaking

    this.logger.log(`[barge-in] INTERRUPT reason="${reason}" session=${sessionId || 'unknown'}`);

    // Fire all listeners
    for (const listener of this.onInterruptListeners) {
      try { listener(); } catch (e) {
        this.logger.error(`[barge-in] listener error: ${e}`);
      }
    }

    // Reset state
    this._isSpeaking = false;
  }

  /** Register a listener that fires on interrupt */
  onInterrupt(listener: () => void): void {
    this.onInterruptListeners.push(listener);
  }

  /** Remove a previously registered listener */
  offInterrupt(listener: () => void): void {
    this.onInterruptListeners = this.onInterruptListeners.filter(l => l !== listener);
  }

  /** Reset all state (on session end) */
  reset(): void {
    this._isSpeaking = false;
    this.sessions.clear();
    this.onInterruptListeners = [];
  }

  getStatus(): { isSpeaking: boolean; sessions: string[]; listenerCount: number } {
    return {
      isSpeaking: this._isSpeaking,
      sessions: Array.from(this.sessions),
      listenerCount: this.onInterruptListeners.length,
    };
  }
}
