import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function TestBrowserPage() {
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        const testInstructions = 'TEST_BROWSER: This is a test to verify the deep link protocol works. Please log all received parameters.';
        
        setStatus('Opening keledon://test deep link...');
        
        const deepLink = `keledon://test?instructions=${encodeURIComponent(testInstructions)}&timestamp=${Date.now()}`;
        
        console.log('[TestBrowser] Attempting to open:', deepLink);
        
        window.location.href = deepLink;
        
        setTimeout(() => {
            setStatus('If browser did not open, check console for errors');
        }, 2000);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Test Browser Auto-Launch</h1>
                <p className="text-muted-foreground mb-4">
                    This page will automatically launch the Keledon Browser
                </p>
                <div className="p-4 bg-muted rounded-lg">
                    <p className="font-mono text-sm">Status: {status}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                    If the browser opens, you should see test instructions in the logs.
                </p>
            </div>
        </div>
    );
}