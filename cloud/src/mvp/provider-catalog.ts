import type { ProviderCatalogEntry } from './mvp-store.types';

export function getProviderCatalog(localOnly = false): ProviderCatalogEntry[] {
  const providers: ProviderCatalogEntry[] = [
    {
      id: 'vosk',
      type: 'stt',
      name: 'VOSK',
      description: 'Local speech-to-text runtime',
      status: 'production',
      is_enabled: true,
      metadata: {
        endpoint:
          process.env.VOSK_SERVER_URL ||
          'wss://keledon.tuyoisaza.com/listen/ws',
        requires_api_key: false,
        auto_start: true,
      },
    },
    {
      id: 'deepgram',
      type: 'stt',
      name: 'Deepgram',
      description: 'Cloud speech-to-text provider',
      status: 'production',
      is_enabled: true,
      metadata: {
        requires_api_key: true,
        required_env: ['DEEPGRAM_API_KEY'],
      },
    },
    {
      id: 'elevenlabs',
      type: 'tts',
      name: 'ElevenLabs',
      description: 'Cloud text-to-speech provider',
      status: 'production',
      is_enabled: true,
      metadata: {
        requires_api_key: true,
        required_env: ['ELEVENLABS_API_KEY'],
      },
    },
    {
      id: 'webspeech',
      type: 'tts',
      name: 'Web Speech API',
      description: 'Browser-native TTS fallback',
      status: 'production',
      is_enabled: true,
      metadata: {
        requires_api_key: false,
      },
    },
    {
      id: 'kokoro',
      type: 'tts',
      name: 'Kokoro TTS',
      description: 'Open-weight TTS on Railway (Spanish/English/JP)',
      status: 'experimental',
      is_enabled: true,
      metadata: {
        requires_api_key: false,
        requires_url: true,
      },
    },
    {
      id: 'speaches-tts',
      type: 'tts',
      name: 'Speaches',
      description:
        'Self-hosted OpenAI-compatible text-to-speech via /v1/audio/speech',
      status: 'production',
      is_enabled: true,
      metadata: {
        endpoint:
          process.env.SPEACHES_API_URL ||
          'https://speaches-production-c63f.up.railway.app/v1/audio/speech',
        voices_endpoint:
          process.env.SPEACHES_API_URL ||
          'https://speaches-production-c63f.up.railway.app/v1/audio/voices',
        requires_api_key: false,
        openai_compatible: true,
        configured_per_team: true,
      },
    },
    {
      id: 'native-dom',
      type: 'rpa',
      name: 'Native DOM Automation',
      description: 'Browser API deterministic actions',
      status: 'production',
      is_enabled: true,
      metadata: {
        requires_api_key: false,
        auto_start: true,
      },
    },
    {
      id: 'playwright',
      type: 'rpa',
      name: 'Playwright',
      description: 'Server-side browser automation',
      status: 'experimental',
      is_enabled: true,
      metadata: {
        requires_api_key: false,
      },
    },
    {
      id: 'cloud-brain',
      type: 'cloud',
      name: 'Cloud Brain',
      description:
        'KELEDON Brain API endpoint — URL del servicio cloud que procesa las solicitudes del Brain',
      status: 'production',
      is_enabled: true,
      metadata: {
        api_url:
          process.env.CLOUD_API_URL || 'https://keledonapi.tuyoisaza.com',
        ws_url: process.env.CLOUD_WS_URL || 'wss://keledonapi.tuyoisaza.com',
        requires_api_key: true,
        required_env: ['CLOUD_API_URL'],
      },
    },
  ];

  if (!localOnly) {
    return providers;
  }

  return providers.filter((provider) => {
    const metadata = provider.metadata || {};
    if (!metadata.requires_api_key) return true;
    const requiredEnv = Array.isArray(metadata.required_env)
      ? metadata.required_env
      : [];
    return requiredEnv.every((envName: string) =>
      Boolean(process.env[envName]),
    );
  });
}
