/**
 * WebRTC Audio Injection Content Script
 * Detects WebRTC contexts (Google Meet, etc.) and injects agent audio into the call
 */

class WebRTCAudioInjector {
    constructor() {
        this.isActive = false;
        this.audioContext = null;
        this.webrtcDetected = false;
        this.injectedStream = null;
        this.originalGetUserMedia = null;
        this.injectedAudioElements = new Set();
        
        // Known WebRTC patterns
        this.webrtcPatterns = {
            'google-meet': {
                urlPattern: /meet\.google\.com/,
                audioSelectors: [
                    '[data-track-id][data-is-audio="true"]',
                    'audio[data-mute-state=""]',
                    '.wAWJd' // Meet audio element class
                ],
                meetContainerSelector: '.pKkEgc', // Meet main container
                localTrackSelector: '[data-self-name]'
            },
            'zoom-web': {
                urlPattern: /zoom\.us/,
                audioSelectors: [
                    '.remote-audio',
                    '.audio-remote',
                    '[data-testid="audio-element"]'
                ]
            },
            'teams-web': {
                urlPattern: /teams\.microsoft\.com/,
                audioSelectors: [
                    '[data-tid="audio-remote-participant"]',
                    '.ts-audio-element',
                    '[role="application"] audio'
                ]
            },
            'generic-webrtc': {
                urlPattern: /webrtc|call|meeting|conference/,
                audioSelectors: [
                    'audio[autoplay]',
                    '[data-media-stream]',
                    '.remote-audio-stream'
                ]
            }
        };
        
        this.init();
    }
    
    async init() {
        console.log('[WebRTC Audio Injector] Initializing...');
        
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.detectWebRTCContext());
        } else {
            this.detectWebRTCContext();
        }
        
        // Monitor for dynamic WebRTC elements
        this.startWebRTCMonitoring();
        
        // Set up message listeners from background script
        this.setupMessageHandlers();
    }
    
    /**
     * Detect if current page is a WebRTC context
     */
    detectWebRTCContext() {
        const url = window.location.href;
        
        for (const [platform, config] of Object.entries(this.webrtcPatterns)) {
            if (config.urlPattern.test(url)) {
                console.log(`[WebRTC Audio Injector] Detected ${platform} context`);
                this.webrtcDetected = true;
                this.currentPlatform = platform;
                this.platformConfig = config;
                
                // Initialize audio injection for detected platform
                this.initializeAudioInjection();
                return true;
            }
        }
        
        // Fallback: Check for active RTCPeerConnection
        if (this.detectActiveRTCPeerConnection()) {
            console.log('[WebRTC Audio Injector] Detected generic WebRTC context');
            this.webrtcDetected = true;
            this.currentPlatform = 'generic-webrtc';
            this.platformConfig = this.webrtcPatterns['generic-webrtc'];
            
            this.initializeAudioInjection();
            return true;
        }
        
        console.log('[WebRTC Audio Injector] No WebRTC context detected');
        return false;
    }
    
    /**
     * Detect active RTCPeerConnection
     */
    detectActiveRTCPeerConnection() {
        // Check for global RTCPeerConnection usage
        return typeof window.RTCPeerConnection !== 'undefined' && 
               document.querySelector('audio[autoplay], video[autoplay]') !== null;
    }
    
    /**
     * Initialize audio injection system
     */
    async initializeAudioInjection() {
        if (!this.webrtcDetected) return;
        
        try {
            console.log('[WebRTC Audio Injector] Initializing audio injection...');
            
            // Create audio context for injection
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Hook into getUserMedia to capture and inject audio
            this.hookGetUserMedia();
            
            // Start monitoring for audio elements
            this.startAudioElementMonitoring();
            
            // Notify background script that WebRTC is detected
            chrome.runtime.sendMessage({
                type: 'WEBRTC_DETECTED',
                platform: this.currentPlatform,
                url: window.location.href,
                timestamp: Date.now()
            });
            
            this.isActive = true;
            console.log('[WebRTC Audio Injector] Audio injection ready');
            
        } catch (error) {
            console.error('[WebRTC Audio Injector] Failed to initialize:', error);
        }
    }
    
    /**
     * Hook into getUserMedia to capture audio streams
     */
    hookGetUserMedia() {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        
        navigator.mediaDevices.getUserMedia = async (constraints) => {
            try {
                console.log('[WebRTC Audio Injector] getUserMedia called with:', constraints);
                
                // Get the original stream
                const stream = await originalGetUserMedia(constraints);
                
                // If this is an audio stream, we need to inject our audio
                if (constraints.audio) {
                    console.log('[WebRTC Audio Injector] Audio stream detected, preparing injection');
                    
                    // Store reference to audio tracks for injection
                    const audioTracks = stream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        this.originalAudioTrack = audioTracks[0];
                        this.localStream = stream;
                        
                        // Setup injection pipeline
                        await this.setupAudioInjectionPipeline(stream);
                    }
                }
                
                return stream;
                
            } catch (error) {
                console.error('[WebRTC Audio Injector] getUserMedia error:', error);
                throw error;
            }
        };
        
        this.originalGetUserMedia = originalGetUserMedia;
    }
    
    /**
     * Setup audio injection pipeline
     */
    async setupAudioInjectionPipeline(localStream) {
        try {
            console.log('[WebRTC Audio Injector] Setting up audio injection pipeline...');
            
            // Create audio context from the stream
            const source = this.audioContext.createMediaStreamSource(localStream);
            
            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1.0;
            
            // Create destination for injection
            const destination = this.audioContext.createMediaStreamDestination();
            
            // Connect the pipeline: source -> gain -> destination
            source.connect(this.gainNode);
            this.gainNode.connect(destination);
            
            // Store the injected stream
            this.injectedStream = destination.stream;
            
            console.log('[WebRTC Audio Injector] Audio injection pipeline ready');
            
        } catch (error) {
            console.error('[WebRTC Audio Injector] Failed to setup injection pipeline:', error);
        }
    }
    
    /**
     * Inject agent audio into WebRTC call
     */
    async injectAgentAudio(audioData) {
        if (!this.isActive || !this.audioContext) {
            console.warn('[WebRTC Audio Injector] Not ready for audio injection');
            return false;
        }
        
        try {
            console.log('[WebRTC Audio Injector] Injecting agent audio...');
            
            // Create audio buffer from audio data
            const audioBuffer = await this.createAudioBuffer(audioData);
            
            // Create audio source
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Connect to the injection pipeline
            source.connect(this.gainNode);
            
            // Start playback
            source.start();
            
            console.log('[WebRTC Audio Injector] Audio injection started');
            return true;
            
        } catch (error) {
            console.error('[WebRTC Audio Injector] Audio injection failed:', error);
            return false;
        }
    }
    
    /**
     * Create audio buffer from audio data
     */
    async createAudioBuffer(audioData) {
        // Handle different audio data formats
        let audioBuffer;
        
        if (audioData instanceof ArrayBuffer) {
            // Decode array buffer
            audioBuffer = await this.audioContext.decodeAudioData(audioData);
        } else if (audioData instanceof Blob) {
            // Convert blob to array buffer then decode
            const arrayBuffer = await audioData.arrayBuffer();
            audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } else if (audioData.audioBuffer) {
            // Pre-decoded audio buffer
            audioBuffer = audioData.audioBuffer;
        } else {
            throw new Error('Unsupported audio data format');
        }
        
        return audioBuffer;
    }
    
    /**
     * Start monitoring for WebRTC changes
     */
    startWebRTCMonitoring() {
        // Monitor for new audio/video elements
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
                        this.handleMediaElement(node);
                    }
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.webrtcObserver = observer;
    }
    
    /**
     * Start monitoring audio elements for injection points
     */
    startAudioElementMonitoring() {
        // Check existing audio elements
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(element => this.handleMediaElement(element));
        
        // Monitor for new elements
        setInterval(() => {
            const newAudioElements = document.querySelectorAll('audio:not([data-keledon-handled])');
            newAudioElements.forEach(element => this.handleMediaElement(element));
        }, 1000);
    }
    
    /**
     * Handle media elements found in the page
     */
    handleMediaElement(element) {
        if (element.hasAttribute('data-keledon-handled')) return;
        
        element.setAttribute('data-keledon-handled', 'true');
        this.injectedAudioElements.add(element);
        
        console.log('[WebRTC Audio Injector] Found media element:', element);
        
        // Monitor element for WebRTC activity
        if (element.src || element.srcObject) {
            this.monitorMediaElement(element);
        }
    }
    
    /**
     * Monitor media element for WebRTC activity
     */
    monitorMediaElement(element) {
        const checkWebRTCActivity = () => {
            if (element.srcObject && element.srcObject.getAudioTracks().length > 0) {
                console.log('[WebRTC Audio Injector] Active WebRTC audio element detected');
                this.activeMediaElement = element;
                
                // Notify background script
                chrome.runtime.sendMessage({
                    type: 'WEBRTC_AUDIO_ACTIVE',
                    elementId: element.id || 'unknown',
                    trackCount: element.srcObject.getAudioTracks().length,
                    timestamp: Date.now()
                });
            }
        };
        
        // Check immediately and periodically
        checkWebRTCActivity();
        setInterval(checkWebRTCActivity, 2000);
    }
    
    /**
     * Setup message handlers from background script
     */
    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.type) {
                case 'WEBRTC_INJECT_AUDIO':
                    console.log('[WebRTC Audio Injector] Received audio injection request');
                    this.injectAgentAudio(message.audioData)
                        .then(success => sendResponse({ success }))
                        .catch(error => sendResponse({ success: false, error: error.message }));
                    return true; // Async response
                    
                case 'WEBRTC_GET_STATUS':
                    sendResponse({
                        isActive: this.isActive,
                        webrtcDetected: this.webrtcDetected,
                        platform: this.currentPlatform,
                        hasActiveElement: !!this.activeMediaElement,
                        audioElementsCount: this.injectedAudioElements.size
                    });
                    break;
                    
                case 'WEBRTC_ENABLE_INJECTION':
                    this.enableInjection();
                    sendResponse({ success: true });
                    break;
                    
                case 'WEBRTC_DISABLE_INJECTION':
                    this.disableInjection();
                    sendResponse({ success: true });
                    break;
            }
        });
    }
    
    /**
     * Enable audio injection
     */
    enableInjection() {
        if (this.gainNode) {
            this.gainNode.gain.value = 1.0;
        }
        this.injectionEnabled = true;
        console.log('[WebRTC Audio Injector] Audio injection enabled');
    }
    
    /**
     * Disable audio injection
     */
    disableInjection() {
        if (this.gainNode) {
            this.gainNode.gain.value = 0.0;
        }
        this.injectionEnabled = false;
        console.log('[WebRTC Audio Injector] Audio injection disabled');
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            webrtcDetected: this.webrtcDetected,
            platform: this.currentPlatform,
            hasActiveElement: !!this.activeMediaElement,
            audioElementsCount: this.injectedAudioElements.size,
            injectionEnabled: this.injectionEnabled || false
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('[WebRTC Audio Injector] Cleaning up...');
        
        if (this.webrtcObserver) {
            this.webrtcObserver.disconnect();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        if (this.originalGetUserMedia) {
            navigator.mediaDevices.getUserMedia = this.originalGetUserMedia;
        }
        
        this.injectedAudioElements.clear();
        this.isActive = false;
    }
}

// Initialize WebRTC audio injector
const webrtcInjector = new WebRTCAudioInjector();

// Make available globally for debugging
window.KeledonWebRTC = webrtcInjector;