import type { TTSResult } from './tts.types';
import { detectLanguage } from './tts-language';
import { estimateDuration } from './tts-utils';

export async function speakWithKokoro(
  text: string,
  baseUrl: string,
  voice: string,
): Promise<TTSResult> {
  try {
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice,
        response_format: 'wav',
      }),
    });
    if (!response.ok) {
      console.error(`[TTS] Kokoro provider returned HTTP ${response.status}`);
      return { error: `Kokoro API returned ${response.status}` };
    }
    const audioData = Buffer.from(await response.arrayBuffer());
    const duration = audioData.length / (24000 * 2);
    const estimatedDuration = estimateDuration(audioData.length);
    console.log(
      `[TTS] Kokoro generated ${audioData.length} bytes, ~${duration.toFixed(1)}s audio (voice: ${voice})`,
    );
    return { audioData, duration: duration || estimatedDuration };
  } catch {
    console.error('[TTS] Kokoro provider request failed');
    return { error: 'Kokoro provider request failed' };
  }
}

export async function speakWithSpeaches(
  text: string,
  baseUrl: string,
  apiKey: string,
  voice: string,
): Promise<TTSResult> {
  try {
    const startedAt = Date.now();
    const lang = detectLanguage(text);
    console.log(
      `[TTS] Speaches request start voice=${voice} lang=${lang} textLen=${text.length}`,
    );
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/v1/audio/speech`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers,
        body: JSON.stringify({
          model: 'speaches-ai/Kokoro-82M-v1.0-ONNX',
          input: text,
          voice,
          response_format: 'mp3',
          speed: 1.15,
        }),
      },
    );
    if (!response.ok) {
      console.error(`[TTS] Speaches provider returned HTTP ${response.status}`);
      return { error: `Speaches API returned ${response.status}` };
    }
    const audioData = Buffer.from(await response.arrayBuffer());
    const elapsedMs = Date.now() - startedAt;
    const duration = estimateDuration(audioData.length);
    console.log(
      `[TTS] Speaches MP3 ${audioData.length} bytes, ~${duration.toFixed(1)}s audio (voice: ${voice}, lang: ${lang}, elapsed=${elapsedMs}ms)`,
    );
    if (audioData.length === 0)
      return { error: 'Speaches returned empty audio' };
    return { audioData, duration, voice, language: lang, elapsedMs };
  } catch {
    console.error('[TTS] Speaches provider request failed');
    return { error: 'Speaches provider request failed' };
  }
}
