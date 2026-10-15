import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';

interface ProviderConfigScope {
  selectedTeamId: string;
  addLog: (message: string) => void;
}

interface ProviderConfig {
  llmProvider?: string | null;
  ttsProvider?: string | null;
  sttProvider?: string | null;
  ttsVoiceId?: string | null;
  openaiApiKeySet?: boolean;
  googleAiApiKeySet?: boolean;
  anthropicApiKeySet?: boolean;
  ttsApiKeySet?: boolean;
  elevenlabsConfig?: { hasApiKey?: boolean };
  deepgramConfig?: { hasApiKey?: boolean };
  speachesApiKeySet?: boolean;
}

interface LoadedConfig {
  requestKey: string;
  data: ProviderConfig | null;
}

export function useBrainProviderConfig({ selectedTeamId, addLog }: ProviderConfigScope) {
  const [configRefreshKey, setConfigRefreshKey] = useState(0);
  const requestKey = useMemo(
    () => (selectedTeamId ? `${selectedTeamId}:${configRefreshKey}` : ''),
    [selectedTeamId, configRefreshKey],
  );
  const [loadedConfig, setLoadedConfig] = useState<LoadedConfig | null>(null);

  useEffect(() => {
    if (!selectedTeamId) return;

    let active = true;
    const currentRequestKey = `${selectedTeamId}:${configRefreshKey}`;
    apiFetch(`/api/teams/${encodeURIComponent(selectedTeamId)}/config`)
      .then(async (response) => (response.ok ? (await response.json()) as ProviderConfig : null))
      .then((data) => {
        if (!active) return;
        if (!data) {
          addLog('Provider config fetch returned no data (maybe auth issue?)');
          setLoadedConfig({ requestKey: currentRequestKey, data: null });
          return;
        }
        const llmKeySet = data.llmProvider === 'openai'
          ? Boolean(data.openaiApiKeySet)
          : data.llmProvider === 'google'
            ? Boolean(data.googleAiApiKeySet)
            : data.llmProvider === 'anthropic'
              ? Boolean(data.anthropicApiKeySet)
              : false;
        const ttsKeySet = data.ttsProvider === 'elevenlabs'
          ? Boolean(data.ttsApiKeySet || data.elevenlabsConfig?.hasApiKey)
          : data.ttsProvider === 'speaches'
            ? Boolean(data.ttsApiKeySet || data.speachesApiKeySet)
            : Boolean(data.ttsApiKeySet);
        const sttKeySet = data.sttProvider === 'deepgram'
          ? Boolean(data.deepgramConfig?.hasApiKey)
          : data.sttProvider === 'speaches'
            ? Boolean(data.speachesApiKeySet)
            : false;
        addLog(`Provider config loaded: LLM=${data.llmProvider || '?'} (key=${llmKeySet}) TTS=${data.ttsProvider || '?'} (key=${ttsKeySet}) STT=${data.sttProvider || '?'} (key=${sttKeySet})`);
        setLoadedConfig({ requestKey: currentRequestKey, data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Failed to load provider config:', error);
        setLoadedConfig({ requestKey: currentRequestKey, data: null });
      });

    return () => {
      active = false;
    };
  }, [selectedTeamId, configRefreshKey, addLog]);

  const currentConfig = requestKey && loadedConfig?.requestKey === requestKey
    ? loadedConfig.data
    : null;

  return {
    llmProvider: currentConfig?.llmProvider || null,
    ttsProvider: currentConfig?.ttsProvider || null,
    sttProvider: currentConfig?.sttProvider || null,
    teamConfigLoading: Boolean(selectedTeamId) && !currentConfig && loadedConfig?.requestKey !== requestKey,
    configRefreshKey,
    setConfigRefreshKey,
    llmApiKeySet: currentConfig?.llmProvider === 'openai'
      ? Boolean(currentConfig.openaiApiKeySet)
      : currentConfig?.llmProvider === 'google'
        ? Boolean(currentConfig.googleAiApiKeySet)
        : currentConfig?.llmProvider === 'anthropic'
          ? Boolean(currentConfig.anthropicApiKeySet)
          : false,
    ttsApiKeySet: currentConfig?.ttsProvider === 'elevenlabs'
      ? Boolean(currentConfig.ttsApiKeySet || currentConfig.elevenlabsConfig?.hasApiKey)
      : currentConfig?.ttsProvider === 'speaches'
        ? Boolean(currentConfig.ttsApiKeySet || currentConfig.speachesApiKeySet)
        : Boolean(currentConfig?.ttsApiKeySet),
    sttKeySet: currentConfig?.sttProvider === 'deepgram'
      ? Boolean(currentConfig.deepgramConfig?.hasApiKey)
      : currentConfig?.sttProvider === 'speaches'
        ? Boolean(currentConfig.speachesApiKeySet)
        : false,
    ttsVoiceId: currentConfig?.ttsVoiceId || null,
  };
}
