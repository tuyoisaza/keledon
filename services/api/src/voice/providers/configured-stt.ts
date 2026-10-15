import { VoiceProviderConfig } from './voice-provider.interface';
import { SttResult } from './stt/stt-adapter.interface';
import { SpeachesSttAdapter } from './stt/speaches-stt.adapter';
import { runtimeAiBudget } from '../../llm/runtime-ai-budget';

/** Existing per-team server STT options; browser-local providers are not substituted. */
export async function transcribeConfiguredAudio(
  config: VoiceProviderConfig,
  audio: Buffer,
  language?: string,
): Promise<SttResult> {
  if (
    process.env.KELEDON_VOICE_DISABLED === 'true' ||
    !audio?.length ||
    audio.length > 4 * 1024 * 1024
  )
    throw new Error('Invalid or disabled audio input');
  return runtimeAiBudget.run(
    `stt:${config.teamId || 'unassigned'}`,
    undefined,
    async () =>
      runtimeAiBudget.trackProviderCall(
        config.sttProvider,
        undefined,
        async () => {
          if (config.sttProvider === 'speaches') {
            if (!config.speachesApiUrl)
              throw new Error('Configured Speaches endpoint required');
            const adapter = new SpeachesSttAdapter();
            await adapter.initialize({
              baseUrl: config.speachesApiUrl,
              apiKey: config.sttApiKey || '',
              model: config.sttModel,
            });
            return adapter.transcribe(audio, { language });
          }
          if (config.sttProvider === 'deepgram') {
            if (!config.sttApiKey)
              throw new Error('Configured Deepgram key required');
            const url = new URL('https://api.deepgram.com/v1/listen');
            url.searchParams.set('model', config.sttModel || 'nova-2');
            url.searchParams.set('smart_format', 'true');
            if (language)
              url.searchParams.set('language', language.split('-')[0]);
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Token ${config.sttApiKey}`,
                'Content-Type': 'audio/wav',
              },
              body: audio as any,
              signal: AbortSignal.timeout(15000),
            });
            if (!response.ok)
              throw new Error(
                `Configured STT failed with HTTP ${response.status}`,
              );
            const data = await response.json();
            const result = data?.results?.channels?.[0]?.alternatives?.[0];
            if (!result || typeof result.transcript !== 'string')
              throw new Error('Invalid STT response');
            return {
              text: result.transcript,
              confidence:
                typeof result.confidence === 'number' ? result.confidence : 0,
              isFinal: true,
            };
          }
          throw new Error(
            'Configured STT provider requires browser-side transcription',
          );
        },
      ),
  );
}
