// Audio Adapters - STT/TTS Interface and Implementations
// This module provides pluggable audio processing capabilities

export { STTAdapter } from './stt/adapter.js';
export { DeepgramSTT } from './stt/deepgram.js';
export { LocalSTT } from './stt/local.js';
export { STTFactory } from './stt/index.js';

export { TTSAdapter } from './tts/adapter.js';
export { ElevenLabsTTS } from './tts/elevenlabs.js';
export { LocalTTS } from './tts/local.js';
export { TTSFactory } from './tts/index.js';

export { VADProcessor } from './vad/processor.js';

// Audio system factory
export function createAudioSystem(config = {}) {
  return {
    stt: STTFactory,
    tts: TTSFactory,
    createSTT: (provider, sttConfig) => STTFactory.create(provider, sttConfig),
    createTTS: (provider, ttsConfig) => TTSFactory.create(provider, ttsConfig),
    getBestSTT: (sttConfig) => STTFactory.getBestProvider(sttConfig),
    getBestTTS: (ttsConfig) => TTSFactory.getBestProvider(ttsConfig),
    validateSTTConfig: (provider, config) => STTFactory.validateConfig(provider, config),
    validateTTSConfig: (provider, config) => TTSFactory.validateConfig(provider, config),
    migrateSTTConfig: (from, to, config) => STTFactory.migrateConfig(from, to, config),
    migrateTTSConfig: (from, to, config) => TTSFactory.migrateConfig(from, to, config)
  };
}