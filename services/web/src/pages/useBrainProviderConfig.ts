import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import type { Team } from '@/lib/crud-api';

interface ProviderConfigScope {
  selectedTeamId: string;
  teams: Team[];
  addLog: (message: string) => void;
}

export function useBrainProviderConfig({ selectedTeamId, teams, addLog }: ProviderConfigScope) {
  const [llmProvider, setLlmProvider] = useState<string | null>(null);
  const [ttsProvider, setTtsProvider] = useState<string | null>(null);
  const [sttProvider, setSttProvider] = useState<string | null>(null);
  const [teamConfigLoading, setTeamConfigLoading] = useState(false);
  const [configRefreshKey, setConfigRefreshKey] = useState(0);
  const [llmApiKeySet, setLlmApiKeySet] = useState(false);
  const [ttsApiKeySet, setTtsApiKeySet] = useState(false);
  const [sttKeySet, setSttKeySet] = useState(false);
  const [ttsVoiceId, setTtsVoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTeamId) {
      setLlmProvider(null);
      setTtsProvider(null);
      setSttProvider(null);
      setLlmApiKeySet(false);
      setTtsApiKeySet(false);
      setSttKeySet(false);
      setTtsVoiceId(null);
      return;
    }

    setTeamConfigLoading(true);
    const team = teams.find((item) => item.id === selectedTeamId);
    if (team) {
      setLlmProvider((team as any).llmProvider || null);
      setTtsProvider((team as any).ttsProvider || null);
      setSttProvider((team as any).sttProvider || null);
    }

    apiFetch(`/api/teams/${selectedTeamId}/config`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) {
          addLog('Provider config fetch returned no data (maybe auth issue?)');
          return;
        }
        setLlmProvider(data.llmProvider || null);
        setTtsProvider(data.ttsProvider || null);
        setSttProvider(data.sttProvider || null);
        setTtsVoiceId(data.ttsVoiceId || null);
        const llmKey = data.llmProvider === 'openai' ? data.openaiApiKey
          : data.llmProvider === 'google' ? data.googleAiApiKey
          : data.llmProvider === 'anthropic' ? data.anthropicApiKey : null;
        setLlmApiKeySet(!!llmKey);
        setTtsApiKeySet(!!(data.ttsApiKey || (data.ttsProvider === 'speaches' ? data.speachesApiKey : null)));
        const sttKey = data.sttProvider === 'deepgram' ? data.deepgramApiKey
          : data.sttProvider === 'speaches' ? data.speachesApiKey : null;
        setSttKeySet(!!sttKey);
        addLog(`Provider config loaded: LLM=${data.llmProvider || '?'} (key=${!!llmKey}) TTS=${data.ttsProvider || '?'} (key=${!!(data.ttsApiKey || (data.ttsProvider === 'speaches' ? data.speachesApiKey : null))}) STT=${data.sttProvider || '?'} (key=${!!sttKey})`);
      })
      .catch((error) => console.error('Failed to load provider config:', error))
      .finally(() => setTeamConfigLoading(false));
  }, [selectedTeamId, teams, configRefreshKey, addLog]);

  return {
    llmProvider,
    ttsProvider,
    sttProvider,
    teamConfigLoading,
    configRefreshKey,
    setConfigRefreshKey,
    llmApiKeySet,
    ttsApiKeySet,
    sttKeySet,
    ttsVoiceId,
  };
}
