import { Ear, BrainCircuit, MousePointerClick, ShieldCheck } from "lucide-react";

const features = [
    {
        icon: Ear,
        title: "WebRTC Audio Capture",
        description: "Connects directly to browser audio streams in Genesys, Salesforce, or Avaya Web to listen in real-time.",
    },
    {
        icon: BrainCircuit,
        title: "Cognitive Decisioning",
        description: "Uses advanced LLMs (GPT-4, Claude) to understand intent, analyze context, and determine next steps.",
    },
    {
        icon: MousePointerClick,
        title: "DOM Automation",
        description: "Acts as a virtual user, clicking buttons, filling forms, and navigating your CRM automatically.",
    },
    {
        icon: ShieldCheck,
        title: "Enterprise Security",
        description: "Runs locally with optional cloud orchestration. PII masking and secure data handling out of the box.",
    },
];

export const FeaturesSection = () => {
    return (
        <section id="features" className="py-24 bg-background relative z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Powerful Capabilities
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Keledon isn't just a chatbot. It's an autonomous agent that integrates deeply with your existing infrastructure.
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
                            <h3 className="text-xl font-semibold text-white mb-3">
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
