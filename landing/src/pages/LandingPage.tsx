import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/common/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/common/Footer";

export default function LandingPage() {
    const { isAuthenticated, isLoading, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            switch (user.role) {
                case 'user':
                    navigate('/launch-agent');
                    break;
                case 'agent':
                case 'coordinator':
                    navigate('/dashboard');
                    break;
                case 'admin':
                case 'superadmin':
                    navigate('/management');
                    break;
                default:
                    navigate('/dashboard');
            }
        }
    }, [isAuthenticated, isLoading, navigate, user]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <ArchitectureSection />
            <UseCasesSection />
            <CTASection />
            <Footer />
        </div>
    );
}
