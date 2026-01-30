const cases = [
    {
        title: "Healthcare Triage",
        desc: "Automatically categorize patient calls, schedule appointments in the EMR, and verify insurance eligibility in real-time.",
        tag: "Healthcare"
    },
    {
        title: "Technical Support",
        desc: "Listen to error descriptions, query the knowledge base, and propose solutions or open tickets in Jira/ServiceNow.",
        tag: "IT Services"
    },
    {
        title: "Order Management",
        desc: "Extract order numbers from voice, look up status in SAP/Salesforce, and process returns without agent typing.",
        tag: "E-Commerce"
    }
];

export const UseCasesSection = () => {
    return (
        <section id="use-cases" className="py-24 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Built for Real World Impact
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {cases.map((useCase, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/10 to-transparent p-px">
                            <div className="relative h-full bg-black/80 backdrop-blur-xl rounded-2xl p-8 hover:bg-black/60 transition-colors">
                                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                                    {useCase.tag}
                                </div>
                                <h3 className="text-2xl font-semibold text-white mb-4">{useCase.title}</h3>
                                <p className="text-gray-400">{useCase.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
