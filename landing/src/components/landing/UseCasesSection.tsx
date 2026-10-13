import { useTranslation } from '@/context/useTranslation';

const cases = [
    { title: 'caseClassificationTitle', description: 'caseClassificationDescription', tag: 'caseConfigured' },
    { title: 'caseSupportTitle', description: 'caseSupportDescription', tag: 'caseItServices' },
    { title: 'caseOrderTitle', description: 'caseOrderDescription', tag: 'caseEcommerce' },
];

export const UseCasesSection = () => {
    const { t } = useTranslation();
    return (
        <section id="use-cases" className="py-24 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        {t('landing.useCasesTitle')}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {cases.map((useCase, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-foreground/10 to-transparent p-px">
                            <div className="relative h-full bg-background/80 backdrop-blur-xl rounded-2xl p-8 hover:bg-background/60 transition-colors">
                                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                                    {t(`landing.${useCase.tag}`)}
                                </div>
                                <h3 className="text-2xl font-semibold text-foreground mb-4">{t(`landing.${useCase.title}`)}</h3>
                                <p className="text-muted-foreground">{t(`landing.${useCase.description}`)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
