import { Link } from 'react-router-dom';
import { ArrowRight } from "lucide-react";
import { useTranslation } from '@/context/useTranslation';

export const HeroSection = () => {
    const { t } = useTranslation();
    return (
        <section aria-labelledby="landing-title" className="relative min-h-screen flex items-center overflow-hidden pt-28 lg:pt-16">
            {/* Background Gradients */}
            <div className="absolute inset-0 bg-background">
                <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
            </div>

            <div className="relative w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 z-10">
                {/* Left: Copy */}
                <div className="w-full min-w-0 lg:w-1/2">
                    <p className="text-xs text-muted-foreground mb-2">{t('landing.disclaimer')}</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-8">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm text-primary">{t('landing.pill')}</span>
                    </div>

                    <h1 id="landing-title" className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
                        {t('landing.headlineCloud')}
                        <br />
                        <span className="gradient-text">{t('landing.headlineAgent')}</span>
                    </h1>

                    <p className="text-lg text-muted-foreground mb-10 max-w-lg">
                        {t('landing.description')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link to="/login" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all">
                            {t('landing.openApp')}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                        <a href="#architecture" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-transparent text-foreground font-semibold hover:bg-foreground/5 border border-border/20 transition-all">
                            {t('landing.architecture')}
                        </a>
                    </div>

                    {/* Stats */}
                    <div className="grid w-full min-w-0 grid-cols-3 gap-3 sm:gap-6 lg:gap-12 mt-12 pt-8 border-t border-border/10">
                        <div>
                            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Cloud</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{t('landing.policyDecisions')}</p>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Browser</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{t('landing.deterministicExecution')}</p>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Client</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{t('landing.configuredInterfaces')}</p>
                        </div>
                    </div>
                </div>

                {/* Right: Session Preview */}
                <div className="w-full min-w-0 lg:w-1/2">
                    <div className="relative w-full min-w-0 rounded-2xl border border-border/10 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                        {/* Window Chrome */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/10 bg-background/40">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                            </div>
                            <div className="text-xs text-muted-foreground ml-2 font-mono">{t('landing.previewLabel')}</div>
                            <div className="ml-auto">
                                <span className="px-2 py-1 rounded text-xs bg-primary/20 text-foreground">{t('landing.previewIntent')}</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Waveform */}
                            <div className="h-20 flex items-end justify-center gap-0.5">
                                {Array.from({ length: 60 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-gradient-to-t from-primary to-purple-400 rounded-full"
                                        style={{
                                            height: `${20 + (i % 5) * 15}%`,
                                            opacity: 0.5 + (i % 3) * 0.2,
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    <span className="text-foreground">{t('landing.listening')}</span>
                                </div>
                                <span className="text-muted-foreground font-mono">{t('landing.speechStatus')}</span>
                            </div>

                            {/* Transcript */}
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/5">
                                <p className="text-xs text-muted-foreground mb-1">{t('landing.transcription')}</p>
                                <p className="text-foreground font-mono">{t('landing.transcriptExample')}</p>
                            </div>

                            {/* Confidence */}
                            <div className="inline-flex px-3 py-1.5 rounded-full bg-primary/20 text-foreground text-sm font-medium">
                                {t('landing.confidence')}: 0.96
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
