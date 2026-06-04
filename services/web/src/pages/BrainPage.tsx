import { cn } from '@/lib/utils';
import type { ChatLine } from './brain-types';
import { useBrainChat } from './use-brain-chat';

export default function BrainPage() {
  const {
    companies,
    brands,
    teams,
    selectedCompanyId,
    selectedBrandId,
    selectedTeamId,
    messages,
    draft,
    loading,
    sending,
    isListening,
    speakingMessageId,
    autoSpeak,
    messagesEndRef,
    audioRef,
    recognitionRef,
    setDraft,
    handleSend,
    handleCompanyChange,
    handleBrandChange,
    handleCompanyKeyDown,
    handleCompanyKeyUp,
    speakReply,
    setAutoSpeak,
    setMessages,
  } = useBrainChat();

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
                            Configure the company, brand, and team context, then chat with KELEDON Brain — by text or voice.
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
                {/* ── Context panel ── */}
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
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
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
                                    {brandsForCompany.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
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
                                    {teamsForBrand.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
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

                {/* ── Chat panel ── */}
                <section className="flex min-h-[720px] flex-col rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-foreground">Brain chat</h2>
                            <p className="text-sm text-muted-foreground">
                                Talk to the brain as the selected brand context.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Auto-speak toggle */}
                            <button
                                type="button"
                                onClick={toggleAutoSpeak}
                                title={autoSpeak ? 'Auto-speak on — click to mute' : 'Auto-speak off — click to enable'}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                                    autoSpeak
                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                <span className="hidden sm:inline">{autoSpeak ? 'Speaking' : 'Muted'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={resetChat}
                                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
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
                                    <div className={cn(
                                        'mt-2 flex items-center gap-2 text-[11px] uppercase tracking-wide',
                                        message.role === 'user'
                                            ? 'text-primary-foreground/70'
                                            : 'text-muted-foreground',
                                    )}>
                                        <span>
                                            {new Date(message.timestamp).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        {/* Speaking indicator */}
                                        {speakingMessageId === message.id && (
                                            <span className="flex items-center gap-0.5">
                                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Typing indicator while sending */}
                        {sending && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm shadow-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="border-t border-border p-5">
                        <label className="block space-y-2">
                            <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <span>Message</span>
                                {isListening && (
                                    <span className="flex items-center gap-1.5 text-red-400">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                                        Listening...
                                    </span>
                                )}
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
                                placeholder={
                                    isListening
                                        ? 'Listening — speak now...'
                                        : 'Ask Brain what the brand should do, say, or explain...'
                                }
                                rows={4}
                                className={cn(
                                    'w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary',
                                    isListening ? 'border-red-400/60' : 'border-border',
                                )}
                            />
                        </label>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground">
                                {configReady
                                    ? 'Brain will answer using the selected company, brand, and team.'
                                    : 'Select all context fields before sending.'}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Mic button */}
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    title={isListening ? 'Stop listening' : 'Speak to Brain'}
                                    className={cn(
                                        'inline-flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                                        isListening
                                            ? 'animate-pulse border-red-400/60 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                            : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </button>

                                {/* Send button */}
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
                    </div>
                </section>
            </div>
        </div>
    );
}
