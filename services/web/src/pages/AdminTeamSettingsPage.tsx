import { useCallback, useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCompanies, type Company } from '@/lib/crud-api';
import { apiFetch } from '@/lib/api-fetch';
import { useTranslation } from '@/context/I18nContext';

interface TeamConfig {
    teamId: string;
    teamName: string;
    sttProvider: string;
    ttsProvider: string;
    voskServerUrl?: string;
    voskModel?: string;
}

export default function AdminSettingsPage() {
    const { t } = useTranslation();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [teamConfig, setTeamConfig] = useState<TeamConfig | null>(null);
    const [savingConfig, setSavingConfig] = useState(false);
    const [configMessage, setConfigMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const companiesData = await getCompanies();
                setCompanies(companiesData);
                if (companiesData.length > 0) {
                    setSelectedCompany(companiesData[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchTeamConfig = useCallback(async (companyId: string) => {
        try {
            const response = await apiFetch(`/api/teams/${companyId}/config`);
            if (response.ok) {
                const data = await response.json();
                setTeamConfig(data);
            } else {
                setTeamConfig({
                    teamId: companyId,
                    teamName: companies.find(c => c.id === companyId)?.name || t('teamSettings.team'),
                    sttProvider: 'vosk',
                    ttsProvider: 'elevenlabs',
                    voskServerUrl: '',
                    voskModel: 'vosk-model-en-us'
                });
            }
        } catch (error) {
            console.error('Failed to fetch team config:', error);
            setTeamConfig({
                teamId: companyId,
                teamName: companies.find(c => c.id === companyId)?.name || t('teamSettings.team'),
                sttProvider: 'vosk',
                ttsProvider: 'elevenlabs',
                voskServerUrl: '',
                voskModel: 'vosk-model-en-us'
            });
        }
    }, [companies, t]);

    useEffect(() => {
        if (selectedCompany) {
            void fetchTeamConfig(selectedCompany);
        }
    }, [fetchTeamConfig, selectedCompany]);

    const saveTeamConfig = async () => {
        if (!teamConfig) return;

        setSavingConfig(true);
        setConfigMessage(null);

        try {
            const response = await apiFetch(`/api/teams/${teamConfig.teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify({
                    sttProvider: teamConfig.sttProvider,
                    ttsProvider: teamConfig.ttsProvider,
                    voskServerUrl: teamConfig.voskServerUrl,
                    voskModel: teamConfig.voskModel,
                }),
            });

            if (response.ok) {
                setConfigMessage({ type: 'success', text: t('teamSettings.saveSuccess') });
            } else {
                setConfigMessage({ type: 'error', text: t('teamSettings.saveFailed') });
            }
        } catch (_error) {
            setConfigMessage({ type: 'error', text: t('teamSettings.saveError') });
        } finally {
            setSavingConfig(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
                <span className="sr-only">{t('teamSettings.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-foreground">{t('teamSettings.title')}</h1>
            </div>

            <div className="mb-6 p-6 rounded-xl bg-card border border-border">
                <label htmlFor="team-settings-company" className="block font-semibold text-lg text-foreground mb-4">{t('teamSettings.selectCompany')}</label>
                <select
                    id="team-settings-company"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="min-h-11 w-full md:w-64 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                >
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-semibold text-lg text-foreground mb-4">{t('teamSettings.configurationTitle')}</h3>

                {teamConfig ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="team-settings-stt-provider" className="block text-sm font-medium text-foreground mb-2">
                                {t('teamSettings.sttProvider')}
                            </label>
                            <select
                                id="team-settings-stt-provider"
                                value={teamConfig.sttProvider}
                                onChange={(e) => setTeamConfig({...teamConfig, sttProvider: e.target.value})}
                                className="min-h-11 w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                            >
                                <option value="vosk">{t('teamSettings.sttVosk')}</option>
                                <option value="deepgram">{t('teamSettings.sttDeepgram')}</option>
                                <option value="webspeech">{t('teamSettings.sttWebSpeech')}</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('teamSettings.sttProviderHelp')}
                            </p>
                        </div>

                        <div>
                            <label htmlFor="team-settings-tts-provider" className="block text-sm font-medium text-foreground mb-2">
                                {t('teamSettings.ttsProvider')}
                            </label>
                            <select
                                id="team-settings-tts-provider"
                                value={teamConfig.ttsProvider}
                                onChange={(e) => setTeamConfig({...teamConfig, ttsProvider: e.target.value})}
                                className="min-h-11 w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                            >
                                <option value="elevenlabs">{t('teamSettings.ttsElevenLabs')}</option>
                                <option value="webspeech">{t('teamSettings.ttsWebSpeech')}</option>
                            </select>
                        </div>

                        {teamConfig.sttProvider === 'vosk' && (
                            <>
                                <div>
                                    <label htmlFor="team-settings-vosk-server-url" className="block text-sm font-medium text-foreground mb-2">
                                        {t('teamSettings.voskServerUrl')}
                                    </label>
                                    <input
                                        id="team-settings-vosk-server-url"
                                        aria-describedby="team-settings-vosk-server-url-help"
                                        type="text"
                                        value={teamConfig.voskServerUrl || ''}
                                        onChange={(e) => setTeamConfig({...teamConfig, voskServerUrl: e.target.value})}
                                        placeholder="wss://your-vosk-server.railway.app"
                                        className="min-h-11 w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                                    />
                                    <p id="team-settings-vosk-server-url-help" className="text-xs text-muted-foreground mt-1">
                                        {t('teamSettings.voskServerUrlHelp')}
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="team-settings-vosk-model" className="block text-sm font-medium text-foreground mb-2">
                                        {t('teamSettings.voskModel')}
                                    </label>
                                    <select
                                        id="team-settings-vosk-model"
                                        value={teamConfig.voskModel || 'vosk-model-en-us'}
                                        onChange={(e) => setTeamConfig({...teamConfig, voskModel: e.target.value})}
                                        className="min-h-11 w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                                    >
                                        <option value="vosk-model-en-us">{t('teamSettings.modelEnUsRecommended')}</option>
                                        <option value="vosk-model-en-us-0.22">{t('teamSettings.modelEnUsV022')}</option>
                                        <option value="vosk-model-en-gb">{t('teamSettings.modelEnGb')}</option>
                                        <option value="vosk-model-de">{t('teamSettings.modelGerman')}</option>
                                        <option value="vosk-model-fr">{t('teamSettings.modelFrench')}</option>
                                        <option value="vosk-model-es">{t('teamSettings.modelSpanish')}</option>
                                        <option value="vosk-model-cn">{t('teamSettings.modelChinese')}</option>
                                        <option value="vosk-model-ru">{t('teamSettings.modelRussian')}</option>
                                        <option value="vosk-model-small-en-us">{t('teamSettings.modelEnUsSmall')}</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('teamSettings.voskModelHelp')}
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="md:col-span-2 flex items-center gap-4">
                            <button
                                onClick={saveTeamConfig}
                                disabled={savingConfig}
                                aria-busy={savingConfig}
                                className="min-h-11 flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                {savingConfig ? (
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Save className="w-4 h-4" aria-hidden="true" />
                                )}
                                {t(savingConfig ? 'teamSettings.saving' : 'teamSettings.saveSettings')}
                            </button>

                            {configMessage && (
                                <span role={configMessage.type === 'error' ? 'alert' : 'status'} aria-live={configMessage.type === 'error' ? 'assertive' : 'polite'} aria-atomic="true" className={cn(
                                    "text-sm",
                                    configMessage.type === 'success' ? "text-green-500" : "text-red-500"
                                )}>
                                    {configMessage.text}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground">{t('teamSettings.loadingConfiguration')}</p>
                )}
            </div>
        </div>
    );
}
