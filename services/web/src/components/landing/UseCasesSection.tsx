const cases = [
    {
        title: "Call Classification",
        desc: "Example workflow: classify a conversation and prepare structured information for a client-approved destination.",
        tag: "Client-configured"
    },
    {
        title: "Technical Support",
        desc: "Example workflow: consult an authorized knowledge base and prepare a support response or a configured ticket action.",
        tag: "IT Services"
    },
    {
        title: "Order Management",
        desc: "Example workflow: capture an order reference and execute a configured lookup after validating the client workflow.",
        tag: "E-Commerce"
    }
];

export const UseCasesSection = () => {
    return (
        <section id="use-cases" className="py-24 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Illustrative Client Workflows
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {cases.map((useCase, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-foreground/10 to-transparent p-px">
                            <div className="relative h-full bg-background/80 backdrop-blur-xl rounded-2xl p-8 hover:bg-background/60 transition-colors">
                                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                                    {useCase.tag}
                                </div>
                                <h3 className="text-2xl font-semibold text-foreground mb-4">{useCase.title}</h3>
                                <p className="text-muted-foreground">{useCase.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
