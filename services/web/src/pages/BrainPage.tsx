import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Brain,
    Building2,
    Loader2,
    RotateCcw,
    Send,
    Sparkles,
    Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
    brainChat,
    getBrands,
    getCompanies,
    getTeams,
    type Brand,
    type BrainChatMessage,
    type Company,
    type Team,
} from '@/lib/crud-api';

type ChatRole = BrainChatMessage['role'];

interface ChatLine {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: string;
}

const STORAGE_KEY = 'keledon-brain-context';

function storageKeyFor(userId?: string) {
    return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function readStoredContext(key: string) {
    if (typeof window === 'undefined') return {};

    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveStoredContext(key: string, data: Record<string, string | undefined>) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(data));
}

export default function BrainPage() {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [messages, setMessages] = useState<ChatLine[]>([
        {
            id: 'brain-welcome',
            role: 'assistant',
            content:
                'I am KELEDON Brain. Choose a company, brand, and team, then chat with me as that operating context.',
            timestamp: new Date().toISOString(),
        },
    ]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const selectedCompany = useMemo(
        () => companies.find((company) => company.id === selectedCompanyId),
        [companies, selectedCompanyId],
    );
    const selectedBrand = useMemo(
        () => brands.find((brand) => brand.id === selectedBrandId),
        [brands, selectedBrandId],
    );
    const selectedTeam = useMemo(
        () => teams.find((team) => team.id === selectedTeamId),
        [teams, selectedTeamId],
    );
    const brandsForCompany = useMemo(
        () => brands.filter((brand) => brand.companyId === selectedCompanyId),
        [brands, selectedCompanyId],
    );
    const teamsForBrand = useMemo(
        () => teams.filter((team) => team.brandId === selectedBrandId),
        [teams, selectedBrandId],
    );
    const configReady = Boolean(selectedCompany && selectedBrand && selectedTeam);

    useEffect(() => {
        const key = storageKeyFor(user?.id);

        async function loadContext() {
            setLoading(true);
            try {
                const [companyList, brandList, teamList] = await Promise.all([
                    getCompanies(),
                    getBrands(),
                    getTeams(),
                ]);

                setCompanies(companyList);
                setBrands(brandList);
                setTeams(teamList);

                const stored = readStoredContext(key);
                const initialCompanyId = stored.companyId || user?.companyId || companyList[0]?.id || '';
                const companyBrands = brandList.filter((brand) => brand.companyId === initialCompanyId);
                const initialBrandId =
                    stored.brandId && companyBrands.some((brand) => brand.id === stored.brandId)
                        ? stored.brandId
                        : companyBrands[0]?.id || '';
                const brandTeams = teamList.filter((team) => team.brandId === initialBrandId);
                const initialTeamId =
                    stored.teamId && brandTeams.some((team) => team.id === stored.teamId)
                        ? stored.teamId
                        : brandTeams[0]?.id || '';

                setSelectedCompanyId(initialCompanyId);
                setSelectedBrandId(initialBrandId);
                setSelectedTeamId(initialTeamId);
            } catch (error) {
                console.error('Failed to load Brain context', error);
                toast.error('Failed to load company, brand, and team data');
            } finally {
                setLoading(false);
            }
        }

        if (user) {
            loadContext();
        }
    }, [user]);

    useEffect(() => {
        if (!user || !selectedCompanyId) return;

        const key = storageKeyFor(user.id);
        saveStoredContext(key, {
            companyId: selectedCompanyId,
            brandId: selectedBrandId,
            teamId: selectedTeamId,
        });
    }, [selectedCompanyId, selectedBrandId, selectedTeamId, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!selectedCompanyId || !brandsForCompany.length) return;
        if (!brandsForCompany.some((brand) => brand.id === selectedBrandId)) {
            const nextBrand = brandsForCompany[0];
            setSelectedBrandId(nextBrand.id);
            const nextTeam = teams.filter((team) => team.brandId === nextBrand.id)[0];
            setSelectedTeamId(nextTeam?.id || '');
        }
    }, [brandsForCompany, selectedBrandId, selectedCompanyId, teams]);

    useEffect(() => {
        if (!selectedBrandId || !teamsForBrand.length) return;
        if (!teamsForBrand.some((team) => team.id === selectedTeamId)) {
            setSelectedTeamId(teamsForBrand[0].id);
        }
    }, [selectedBrandId, selectedTeamId, teamsForBrand]);

    function handleCompanyChange(companyId: string) {
        setSelectedCompanyId(companyId);
        const nextBrands = brands.filter((brand) => brand.companyId === companyId);
        const nextBrand = nextBrands[0];
        setSelectedBrandId(nextBrand?.id || '');
        const nextTeam = teams.filter((team) => team.brandId === nextBrand?.id)[0];
        setSelectedTeamId(nextTeam?.id || '');
    }

    function handleBrandChange(brandId: string) {
        setSelectedBrandId(brandId);
        const nextTeam = teams.filter((team) => team.brandId === brandId)[0];
        setSelectedTeamId(nextTeam?.id || '');
    }

    async function handleSend() {
        const trimmed = draft.trim();
        if (!trimmed || sending) return;
        if (!configReady) {
            toast.error('Select a company, brand, and team first');
            return;
        }

        const userMessage: ChatLine = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            timestamp: new Date().toISOString(),
        };

        const nextHistory: BrainChatMessage[] = [...messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
        }));

        setMessages((current) => [...current, userMessage]);
        setDraft('');
        setSending(true);

        try {
            const response = await brainChat({
                message: trimmed,
                history: nextHistory.slice(-12),
                companyId: selectedCompany?.id,
                companyName: selectedCompany?.name,
                brandId: selectedBrand?.id,
                brandName: selectedBrand?.name,
                teamId: selectedTeam?.id,
                teamName: selectedTeam?.name,
                language: user?.role ? 'en' : undefined,
            });

            setMessages((current) => [
                ...current,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: response.reply,
                    timestamp: new Date().toISOString(),
                },
            ]);
        } catch (error) {
            console.error('Brain chat failed', error);
            toast.error('Could not reach the Brain right now');
            setMessages((current) => [
                ...current,
                {
                    id: `assistant-error-${Date.now()}`,
                    role: 'assistant',
                    content:
                        'I could not reach the Brain service. Check the cloud API and try again.',
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setSending(false);
        }
    }

    function resetChat() {
        setMessages([
            {
                id: `brain-reset-${Date.now()}`,
                role: 'assistant',
                content:
                    'Brain context ready. Send me a message and I will answer as the selected company, brand, and team.',
                timestamp: new Date().toISOString(),
            },
        ]);
    }

    const contextSummary = [
        selectedCompany ? selectedCompany.name : 'No company selected',
        selectedBrand ? selectedBrand.name : 'No brand selected',
        selectedTeam ? selectedTeam.name : 'No team selected',
    ].join(' • ');

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                        <Brain className="h-3.5 w-3.5" />
                        Brand Brain
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Brain</h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Configure the company, brand, and team context, then chat with KELEDON Brain the same way the operator brain would.
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                    <div className="flex items-center gap-2 text-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Live context
                    </div>
                    <p className="mt-1 max-w-sm">{contextSummary}</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h2 className="font-semibold text-foreground">Context configuration</h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading companies, brands, and teams...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block space-y-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Company
                                </span>
                                <select
                                    value={selectedCompanyId}
                                    onChange={(e) => handleCompanyChange(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                                >
                                    <option value="">Select company</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block space-y-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Brand
                                </span>
                                <select
                                    value={selectedBrandId}
                                    onChange={(e) => handleBrandChange(e.target.value)}
                                    disabled={!selectedCompanyId}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value="">Select brand</option>
                                    {brandsForCompany.map((brand) => (
                                        <option key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block space-y-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Team
                                </span>
                                <select
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    disabled={!selectedBrandId}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value="">Select team</option>
                                    {teamsForBrand.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Tag className="h-4 w-4" />
                                    Brain identity
                                </div>
                                <p className="mt-2">
                                    The chat will use the selected company, brand, and team as the brand frame of reference.
                                </p>
                                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                                    {configReady ? 'Ready to chat' : 'Please complete all selections'}
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                <section className="flex min-h-[720px] flex-col rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-foreground">Brain chat</h2>
                            <p className="text-sm text-muted-foreground">
                                Talk to the brain as the selected brand context.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={resetChat}
                            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset
                        </button>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    'flex',
                                    message.role === 'user' ? 'justify-end' : 'justify-start',
                                )}
                            >
                                <div
                                    className={cn(
                                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'border border-border bg-muted/40 text-foreground',
                                    )}
                                >
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                    <p
                                        className={cn(
                                            'mt-2 text-[11px] uppercase tracking-wide',
                                            message.role === 'user'
                                                ? 'text-primary-foreground/70'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {new Date(message.timestamp).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t border-border p-5">
                        <label className="block space-y-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Message
                            </span>
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        void handleSend();
                                    }
                                }}
                                placeholder="Ask Brain what the brand should do, say, or explain..."
                                rows={4}
                                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                            />
                        </label>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground">
                                {configReady
                                    ? 'Brain will answer using the selected company, brand, and team.'
                                    : 'Select all context fields before sending.'}
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleSend()}
                                disabled={sending || !draft.trim() || !configReady}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Send to Brain
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
