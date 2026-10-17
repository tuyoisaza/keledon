import { ThemeControls } from '@/components/common/ThemeControls';
import { VersionActions } from './VersionActions';
import { useState, useEffect } from "react";
import { Menu, X, Bot, LogIn, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from '@/context/I18nContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { isAuthenticated, user, logout } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: t('landing.navFeatures'), href: "#features" },
        { name: t('landing.architecture'), href: "#architecture" },
        { name: t('landing.navUseCases'), href: "#use-cases" },
    ];

    const handleDashboardClick = () => {
        if (isAuthenticated) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <nav aria-label={t('landing.primaryNavigation')}
            className={cn(
                "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
                scrolled ? "glass border-border/10" : "bg-transparent"
            )}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-24">
                    <div className="flex-shrink-0 flex flex-col items-start gap-1">
                        <Link to="/" className="flex items-center gap-2" aria-label="KELEDON">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <Bot className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-foreground">Keledon</span>
                        </Link>
                        <VersionActions />
                    </div>

                    <div className="hidden lg:block">
                        <div className="ml-10 flex items-center space-x-4">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {link.name}
                                </a>
                            ))}

                            <div className="flex items-center gap-2 pl-2">
                                <ThemeControls />
                                <LanguageSwitcher />
                            </div>

                            {isAuthenticated ? (
                                <>
                                    <button
                                        onClick={handleDashboardClick}
                                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {t('landing.navDashboard')}
                                    </button>
                                    <div className="flex items-center gap-3 pl-4 border-l border-border/20">
                                        <div className="flex items-center gap-2">
                                            {user?.avatar ? (
                                                <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground">
                                                    {user?.name?.charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-sm text-muted-foreground">{user?.name?.split(' ')[0]}</span>
                                        </div>
                                        <button
                                            onClick={logout}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {t('landing.navLogout')}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        {t('landing.navLogin')}
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        {t('landing.navSignUp')}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="lg:hidden">
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-expanded={isOpen}
                            aria-controls="public-mobile-menu"
                            aria-label={isOpen ? t('landing.closeMenu') : t('landing.openMenu')}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div id="public-mobile-menu" hidden={!isOpen} className="lg:hidden glass border-b border-border/10">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="flex min-h-11 items-center px-3 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}

                        <div className="flex flex-wrap items-center gap-3 px-3 pt-3 border-t border-border/10">
                            <ThemeControls />
                            <LanguageSwitcher />
                        </div>

                        {isAuthenticated ? (
                            <>
                                <button
                                    onClick={() => { handleDashboardClick(); setIsOpen(false); }}
                                    className="flex min-h-11 w-full items-center text-left px-3 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                                >
                                    {t('landing.navDashboard')}
                                </button>
                                <button
                                    onClick={() => { logout(); setIsOpen(false); }}
                                    className="flex min-h-11 w-full items-center text-left px-3 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                                >
                                    {t('landing.navLogout')}
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-2 pt-4 border-t border-border/10 mt-4">
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-muted/50 text-foreground font-medium"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <LogIn className="w-4 h-4" />
                                    {t('landing.navLogin')}
                                </Link>
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <UserPlus className="w-4 h-4" />
                                    {t('landing.navSignUp')}
                                </Link>
                            </div>
                        )}
                    </div>
            </div>
        </nav>
    );
};
