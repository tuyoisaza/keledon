import { Ear, BrainCircuit, MousePointerClick, ShieldCheck } from "lucide-react";
import { useTranslation } from '@/context/I18nContext';

const features = [
    { icon: Ear, title: 'audioFeatureTitle', description: 'audioFeatureDescription' },
    { icon: BrainCircuit, title: 'decisionFeatureTitle', description: 'decisionFeatureDescription' },
    { icon: MousePointerClick, title: 'automationFeatureTitle', description: 'automationFeatureDescription' },
    { icon: ShieldCheck, title: 'securityFeatureTitle', description: 'securityFeatureDescription' },
];

export const FeaturesSection = () => {
    const { t } = useTranslation();
    return (
        <section id="features" className="py-24 bg-background relative z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        {t('landing.featuresTitle')}
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        {t('landing.featuresDescription')}
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
                                {t(`landing.${feature.title}`)}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {t(`landing.${feature.description}`)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
