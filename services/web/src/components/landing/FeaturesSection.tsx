import { Ear, BrainCircuit, MousePointerClick, ShieldCheck } from "lucide-react";

const features = [
    {
        icon: Ear,
        title: "WebRTC Audio Capture",
        description: "Captures supported browser audio for the speech provider configured by each client. Platform compatibility requires client-specific validation.",
    },
    {
        icon: BrainCircuit,
        title: "Cognitive Decisioning",
        description: "Cloud workflows use the configured model, managed prompts and validated output contracts to determine next steps.",
    },
    {
        icon: MousePointerClick,
        title: "DOM Automation",
        description: "Executes approved browser actions within configured client origins and validates required outcomes.",
    },
    {
        icon: ShieldCheck,
        title: "Enterprise Security",
        description: "Cloud decisions and local browser execution use tenant permissions, scoped credentials and bounded diagnostics.",
    },
];

export const FeaturesSection = () => {
    return (
        <section id="features" className="py-24 bg-background relative z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Powerful Capabilities
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Keledon coordinates voice, cloud decisions and browser execution through workflows configured for each client.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                <feature.icon className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
