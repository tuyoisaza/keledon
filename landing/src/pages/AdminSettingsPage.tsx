import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCompanies, type Company } from '@/lib/crud-api';
import { API_URL } from '@/lib/config';

interface TeamConfig {
    teamId: string;
    teamName: string;
    sttProvider: string;
    ttsProvider: string;
    voskServerUrl?: string;
    voskModel?: string;
}

export default function AdminSettingsPage() {
    const cloudUrl = API_URL;
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

    useEffect(() => {
        if (selectedCompany) {
            fetchTeamConfig(selectedCompany);
        }
    }, [selectedCompany]);

    const fetchTeamConfig = async (companyId: string) => {
        try {
            const response = await fetch(`${cloudUrl}/api/teams/${companyId}/config`);
            if (response.ok) {
                const data = await response.json();
                setTeamConfig(data);
            } else {
                setTeamConfig({
                    teamId: companyId,
                    teamName: companies.find(c => c.id === companyId)?.name || 'Team',
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
                teamName: companies.find(c => c.id === companyId)?.name || 'Team',
                sttProvider: 'vosk',
                ttsProvider: 'elevenlabs',
                voskServerUrl: '',
                voskModel: 'vosk-model-en-us'
            });
        }
    };

    const saveTeamConfig = async () => {
        if (!teamConfig) return;
        
        setSavingConfig(true);
        setConfigMessage(null);
        
        try {
            const response = await fetch(`${cloudUrl}/api/teams/${teamConfig.teamId}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sttProvider: teamConfig.sttProvider,
                    ttsProvider: teamConfig.ttsProvider,
                    voskServerUrl: teamConfig.voskServerUrl,
                    voskModel: teamConfig.voskModel,
                })
            });
            
            if (response.ok) {
                setConfigMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                setConfigMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setConfigMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setSavingConfig(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Team Settings</h1>
            </div>

            <div className="mb-6 p-6 rounded-xl bg-card border border-border">
                <h3 className="font-semibold text-lg text-foreground mb-4">Select Company</h3>
                <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full md:w-64 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-semibold text-lg text-foreground mb-4">STT/TTS Provider Configuration</h3>
                
                {teamConfig ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Speech-to-Text (STT) Provider
                            </label>
                            <select
                                value={teamConfig.sttProvider}
                                onChange={(e) => setTeamConfig({...teamConfig, sttProvider: e.target.value})}
                                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="vosk">VOSK (Local - Recommended)</option>
                                <option value="deepgram">Deepgram (Cloud)</option>
                                <option value="webspeech">Web Speech API (Browser)</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                VOSK runs locally for free. Deepgram is cloud-based.
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Text-to-Speech (TTS) Provider
                            </label>
                            <select
                                value={teamConfig.ttsProvider}
                                onChange={(e) => setTeamConfig({...teamConfig, ttsProvider: e.target.value})}
                                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="elevenlabs">ElevenLabs (Recommended)</option>
                                <option value="webspeech">Web Speech API (Browser)</option>
                            </select>
                        </div>
                        
                        {teamConfig.sttProvider === 'vosk' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        VOSK Server URL
                                    </label>
                                    <input
                                        type="text"
                                        value={teamConfig.voskServerUrl || ''}
                                        onChange={(e) => setTeamConfig({...teamConfig, voskServerUrl: e.target.value})}
                                        placeholder="wss://your-vosk-server.railway.app"
                                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Enter the URL of your VOSK server (e.g., wss://keledon-vosk.railway.app)
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        VOSK Model
                                    </label>
                                    <select
                                        value={teamConfig.voskModel || 'vosk-model-en-us'}
                                        onChange={(e) => setTeamConfig({...teamConfig, voskModel: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="vosk-model-en-us">English (US) - Recommended</option>
                                        <option value="vosk-model-en-us-0.22">English (US) v0.22</option>
                                        <option value="vosk-model-en-gb">English (GB)</option>
                                        <option value="vosk-model-de">German</option>
                                        <option value="vosk-model-fr">French</option>
                                        <option value="vosk-model-es">Spanish</option>
                                        <option value="vosk-model-cn">Chinese</option>
                                        <option value="vosk-model-ru">Russian</option>
                                        <option value="vosk-model-small-en-us">English (US) - Small</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Select the VOSK model for speech recognition
                                    </p>
                                </div>
                            </>
                        )}
                        
                        <div className="md:col-span-2 flex items-center gap-4">
                            <button
                                onClick={saveTeamConfig}
                                disabled={savingConfig}
                                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {savingConfig ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save Settings
                            </button>
                            
                            {configMessage && (
                                <span className={cn(
                                    "text-sm",
                                    configMessage.type === 'success' ? "text-green-500" : "text-red-500"
                                )}>
                                    {configMessage.text}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground">Loading team configuration...</p>
                )}
            </div>
        </div>
    );
}
