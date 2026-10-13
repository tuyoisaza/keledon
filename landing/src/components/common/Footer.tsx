import { useTranslation } from '@/context/useTranslation';

export const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer className="border-t border-border/10 bg-background py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xl tracking-tight text-foreground">
                        Keledon
                    </span>
                    <span className="text-muted-foreground text-sm">© 2026</span>
                </div>
                <div className="flex gap-8 text-sm text-muted-foreground">
                    <a href="#architecture" className="hover:text-foreground transition-colors">{t('landing.architecture')}</a>
                </div>
            </div>
        </footer>
    );
};
