import { useEffect, useState } from 'react';

export default function TestBrowserPage() {
    const [status] = useState('Opening keledon://test deep link...');

    useEffect(() => {
        const testInstructions = 'TEST_BROWSER: This is a test to verify the deep link protocol works. Please log all received parameters.';
        
        
        const deepLink = `keledon://test?instructions=${encodeURIComponent(testInstructions)}&timestamp=${Date.now()}`;
        
        console.log('[TestBrowser] Attempting to open:', deepLink);
        
        window.location.href = deepLink;
        
        setTimeout(() => {
            // The browser may remain on this page when the custom protocol has no handler.
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
