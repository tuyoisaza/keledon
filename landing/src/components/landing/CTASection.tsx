export const CTASection = () => {
    return (
        <section className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative rounded-3xl overflow-hidden bg-primary px-6 py-16 sm:px-16 sm:py-24 md:p-20">
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
                    <div className="relative z-10 text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Ready to transform your contact center?
                        </h2>
                        <p className="mx-auto mt-6 max-w-xl text-lg text-blue-100">
                            Start your pilot today and see how Keledon can reduce generic call times by up to 40%.
                        </p>
                        <div className="mt-10 flex justify-center gap-6">
                            <button className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-primary hover:bg-blue-50 transition-colors shadow-lg">
                                Get Started
                            </button>
                            <button className="rounded-lg bg-transparent border border-white px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors">
                                Contact Sales
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
