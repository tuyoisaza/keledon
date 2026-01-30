export const Footer = () => {
    return (
        <footer className="border-t border-white/10 bg-black py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xl tracking-tight text-white">
                        Keledon
                    </span>
                    <span className="text-gray-500 text-sm">© 2026</span>
                </div>
                <div className="flex gap-8 text-sm text-gray-400">
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms</a>
                    <a href="#" className="hover:text-white transition-colors">Twitter</a>
                    <a href="#" className="hover:text-white transition-colors">GitHub</a>
                </div>
            </div>
        </footer>
    );
};
