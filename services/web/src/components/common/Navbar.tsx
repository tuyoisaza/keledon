import { useState, useEffect } from "react";
import { Menu, X, Bot, LogIn, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Features", href: "#features" },
        { name: "Architecture", href: "#architecture" },
        { name: "Use Cases", href: "#use-cases" },
    ];

    const handleDashboardClick = () => {
        if (isAuthenticated) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <nav
            className={cn(
                "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
                scrolled ? "glass border-white/10" : "bg-transparent"
            )}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">
                            Keledon
                        </span>
                    </div>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-6">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                                >
                                    {link.name}
                                </a>
                            ))}

                            {isAuthenticated ? (
                                <>
                                    <button
                                        onClick={handleDashboardClick}
                                        className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                                    >
                                        Dashboard
                                    </button>
                                    <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                                        <div className="flex items-center gap-2">
                                            {user?.avatar ? (
                                                <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground">
                                                    {user?.name?.charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-sm text-gray-300">{user?.name?.split(' ')[0]}</span>
                                        </div>
                                        <button
                                            onClick={logout}
                                            className="text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Login
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-300 hover:text-white"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden glass border-b border-white/10">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/5"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}

                        {isAuthenticated ? (
                            <>
                                <button
                                    onClick={() => { handleDashboardClick(); setIsOpen(false); }}
                                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/5"
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => { logout(); setIsOpen(false); }}
                                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/5"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-2 pt-4 border-t border-white/10 mt-4">
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-muted/50 text-foreground font-medium"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <LogIn className="w-4 h-4" />
                                    Login
                                </Link>
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};
