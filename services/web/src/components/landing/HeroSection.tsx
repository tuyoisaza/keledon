import { ArrowRight, Play } from "lucide-react";

export const HeroSection = () => {
    return (
        <div className="relative min-h-screen flex items-center overflow-hidden pt-16">
            {/* Background Gradients */}
            <div className="absolute inset-0 bg-background">
                <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-16 z-10">
                {/* Left: Copy */}
                <div className="lg:w-1/2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-8">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm text-primary">Autonomous AI for Contact Centers</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
                        The Cloud Decides.
                        <br />
                        <span className="gradient-text">The Agent Executes.</span>
                    </h1>

                    <p className="text-lg text-muted-foreground mb-10 max-w-lg">
                        Keledon is an autonomous inbound agent that handles calls, navigates web interfaces, and executes workflows—all while keeping humans in control.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all">
                            Request Early Access
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                        <button className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-transparent text-white font-semibold hover:bg-white/5 border border-white/20 transition-all">
                            <Play className="w-4 h-4 mr-2" />
                            Watch Demo
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-12 mt-12 pt-8 border-t border-white/10">
                        <div>
                            <p className="text-3xl font-bold text-white">100%</p>
                            <p className="text-sm text-muted-foreground">Automation Ready</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">&lt;500ms</p>
                            <p className="text-sm text-muted-foreground">Response Time</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">24/7</p>
                            <p className="text-sm text-muted-foreground">Availability</p>
                        </div>
                    </div>
                </div>

                {/* Right: Session Preview */}
                <div className="lg:w-1/2">
                    <div className="relative rounded-2xl border border-white/10 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                        {/* Window Chrome */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/40">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                            </div>
                            <div className="text-xs text-muted-foreground ml-2 font-mono">keledon://active-session</div>
                            <div className="ml-auto">
                                <span className="px-2 py-1 rounded text-xs bg-primary/20 text-primary">intent: check_status</span>
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
                                    <span className="text-foreground">Listening...</span>
                                </div>
                                <span className="text-muted-foreground font-mono">STT: streaming | TTS: ready</span>
                            </div>

                            {/* Transcript */}
                            <div className="p-4 rounded-lg bg-muted/50 border border-white/5">
                                <p className="text-xs text-muted-foreground mb-1">Transcription</p>
                                <p className="text-foreground font-mono">"I need to check my case status..."</p>
                            </div>

                            {/* Confidence */}
                            <div className="inline-flex px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium">
                                confidence: 0.96
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
