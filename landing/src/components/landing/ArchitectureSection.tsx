import { useTranslation } from '@/context/useTranslation';

export const ArchitectureSection = () => {
    const { t } = useTranslation();
    return (
        <section id="architecture" className="py-24 bg-background/50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                            {t('landing.architectureTitle')}
                        </h2>
                        <p className="text-muted-foreground text-lg mb-8">
                            {t('landing.architectureDescription')}
                        </p>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-none w-px h-full bg-gradient-to-b from-primary to-transparent mx-4" />
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">{t('landing.browserAgent')}</h3>
                                    <p className="text-muted-foreground">{t('landing.browserAgentDescription')}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-none w-px h-full bg-gradient-to-b from-purple-500 to-transparent mx-4" />
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">{t('landing.cloudBrain')}</h3>
                                    <p className="text-muted-foreground">{t('landing.cloudBrainDescription')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative">
                        {/* Abstract visualization */}
                        <div className="relative z-10 p-8 rounded-2xl bg-foreground/5 border border-border/10 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div className="p-4 rounded-lg bg-blue-500/20 border border-blue-500/30 text-foreground font-mono text-sm">
                                    {t('landing.browserContext')}
                                </div>
                                <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-500/50 to-purple-500/50 mx-4 animate-pulse" />
                                <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/30 text-foreground font-mono text-sm">
                                    {t('landing.cloudContext')}
                                </div>
                            </div>
                            <div className="space-y-3 font-mono text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>{t('landing.audioStream')}</span>
                                    <span>{t('landing.soundProcessing')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('landing.domAccess')}</span>
                                    <span>{t('landing.llmReasoning')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('landing.userActions')}</span>
                                    <span>{t('landing.databaseSync')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-10 left-10 w-full h-full bg-primary/5 rounded-2xl -z-10 blur-3xl" />
                    </div>
                </div>
            </div>
        </section>
    );
};
