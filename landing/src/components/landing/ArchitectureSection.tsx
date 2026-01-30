export const ArchitectureSection = () => {
    return (
        <section id="architecture" className="py-24 bg-black/50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                            Distributed Architecture
                        </h2>
                        <p className="text-gray-400 text-lg mb-8">
                            Keledon splits intelligence between the local browser context and the scalable cloud brain.
                        </p>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-none w-px h-full bg-gradient-to-b from-primary to-transparent mx-4" />
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Browser Extension (Agent)</h3>
                                    <p className="text-gray-400">Captures audio via WebRTC, injects into DOM, and executes actions locally for zero-latency UI manipulation.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-none w-px h-full bg-gradient-to-b from-purple-500 to-transparent mx-4" />
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Cloud Brain (NestJS)</h3>
                                    <p className="text-gray-400">Handles heavy LLM inference, state management, and RAG lookups across your knowledge base.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative">
                        {/* Abstract visualization */}
                        <div className="relative z-10 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div className="p-4 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-200 font-mono text-sm">
                                    Browser Context
                                </div>
                                <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-500/50 to-purple-500/50 mx-4 animate-pulse" />
                                <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-200 font-mono text-sm">
                                    Cloud Context
                                </div>
                            </div>
                            <div className="space-y-3 font-mono text-xs text-gray-500">
                                <div className="flex justify-between">
                                    <span>Audio Stream</span>
                                    <span>Sound Processing</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>DOM Access</span>
                                    <span>LLM Reasoning</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>User Actions</span>
                                    <span>Database Sync</span>
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
