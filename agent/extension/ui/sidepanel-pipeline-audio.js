class PipelineAudio {
// Core pipeline functions
  async toggleMute() {
    if (isSTTListening) {
      this.stopSTTListening();
    } else {
      this.startSTTListening();
    }
  }

  async startSTTListening() {
    if (!agentActive) {
      this.log('error', 'Agent is inactive - cannot start STT');
      this.updateStage('listen', 'error');
      this.updateStage('transcribe', 'error');
      return;
    }

    // Note: Web Speech API (SpeechRecognition) uses default audio input
    // It does NOT require explicit microphone permission in Chrome extensions
    
    try {
      this.updateStage('listen', 'processing');
      this.updateStage('transcribe', 'processing');
      this.log('info', 'Starting STT (Web Speech API - no mic permission needed)...');
      
      // Initialize STT if needed
      if (!sttRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          this.log('error', 'Speech Recognition API not available in this browser');
          this.updateStage('listen', 'error');
          this.updateStage('transcribe', 'error');
          return;
        }
        
        sttRecognition = new SpeechRecognition();
        sttRecognition.continuous = true;
        sttRecognition.interimResults = true;
        sttRecognition.lang = 'en-US';
        
        sttRecognition.onstart = () => {
          this.log('success', 'STT recognition started (Web Speech API)');
          isSTTListening = true;
          this.updateStage('listen', 'active');
          this.updateStage('transcribe', 'active');
        };
        
        sttRecognition.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            this.log('info', `STT final result: "${result[0].transcript}" (confidence: ${result[0].confidence || 'N/A'})`);
            this.processTranscription(result[0].transcript);
          } else {
            this.log('info', `STT interim result: "${result[0].transcript}"`);
          }
        };
        
        sttRecognition.onerror = (event) => {
          this.log('error', `STT Error: ${event.error}`);
          this.updateStage('listen', 'error');
          this.updateStage('transcribe', 'error');
          isSTTListening = false;
          
          // Provide specific help for common errors
          if (event.error === 'no-speech') {
            this.log('info', 'STT: No speech detected - try speaking clearly');
          } else if (event.error === 'audio-capture') {
            this.log('error', 'STT: Audio capture failed - check microphone');
            this.addMicrophoneHelp();
          } else if (event.error === 'not-allowed') {
            this.log('error', 'STT: Microphone permission denied');
            this.addMicrophonePermissionHelp();
          }
        };
        
        sttRecognition.onend = () => {
          this.log('info', 'STT recognition ended');
          isSTTListening = false;
          this.updateStage('listen', 'idle');
          this.updateStage('transcribe', 'idle');
        };
      }
       
      // Start STT (Web Speech API - no microphone permission needed)
      sttRecognition.start();
      this.log('success', 'STT Listening started');
       
    } catch (error) {
      this.log('error', `Failed to start STT: ${error.message}`);
      this.updateStage('listen', 'error');
      this.updateStage('transcribe', 'error');
    }
  }

  addMicrophonePermissionHelp() {
    this.log('info', '=== MICROPHONE PERMISSION HELP ===');
    this.log('info', 'To enable microphone access:');
    this.log('info', '1. Click the lock icon in the address bar');
    this.log('info', '2. Find "Microphone" in the permissions list');
    this.log('info', '3. Change setting from "Block" to "Allow"');
    this.log('info', '4. Reload the page and try again');
    this.log('info', '=== END PERMISSION HELP ===');
  }

  addMicrophoneHelp() {
    this.log('info', '=== MICROPHONE TROUBLESHOOTING ===');
    this.log('info', 'Microphone issues:');
    this.log('info', '1. Check if microphone is connected');
    this.log('info', '2. Verify microphone is not muted');
    this.log('info', '3. Check system sound settings');
    this.log('info', '4. Try a different browser');
    this.log('info', '=== END TROUBLESHOOTING ===');
  }

  stopSTTListening() {
    if (sttRecognition && isSTTListening) {
      sttRecognition.stop();
      isSTTListening = false;
      this.updateStage('listen', 'idle');
      this.updateStage('transcribe', 'idle');
      this.log('info', 'STT Listening stopped');
    }
  }

  // Microphone input - sends voice directly to brain orchestrator
  async startMicInput() {
    if (!agentActive) {
      this.log('error', 'Agent is inactive - cannot start microphone');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.log('info', 'Microphone started - sending to brain');
      
      // TODO: Stream audio to brain via WebSocket
      // For now, just log that mic is active
      const micBtn = document.getElementById('micBtn');
      if (micBtn) {
        micBtn.classList.add('recording');
        micBtn.textContent = '⏹️';
      }
      
      // Store stream for later use
      this.micStream = stream;
      
      this.log('info', 'Microphone input ready - streaming to brain');
    } catch (error) {
      this.log('error', `Microphone error: ${error.message}`);
    }
  }

  async processTranscription(text) {
    this.updateStage('transcribe', 'active');
    this.log('info', `Transcribed: "${text}"`);
    
    // Move to think stage
    this.updateStage('think', 'processing');
    this.updateStage('transcribe', 'idle');
    
    await this.processAIResponse(text);
  }

  async processAIResponse(input) {
    this.updateStage('think', 'active');
    this.log('info', 'Processing AI response...');
    
    // Simulate AI processing
    setTimeout(() => {
      const response = `Processed: ${input}`;
      this.updateStage('think', 'idle');
      this.updateStage('respond', 'active');
      this.log('success', `AI Response: ${response}`);
      
      this.sendResponse(response);
    }, 1000);
  }

  sendResponse(response) {
    this.updateStage('respond', 'active');
    this.log('info', 'Sending response...');
    
    // Move to speak stage
    setTimeout(() => {
      this.speakResponse(response);
    }, 500);
  }

  async speakResponse(text) {
    if (!agentActive) {
      this.log('warning', 'Agent is inactive - TTS disabled');
      return;
    }

    this.updateStage('speak', 'processing');
    this.updateStage('respond', 'idle');
    
    try {
      // Check TTS support
      if (!('speechSynthesis' in window)) {
        this.log('error', 'Text-to-Speech not supported in this browser');
        this.updateStage('speak', 'error');
        return;
      }

      // Check available voices
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        this.log('error', 'No TTS voices available');
        this.updateStage('speak', 'error');
        this.addTTSVoiceHelp();
        return;
      }

      this.log('info', `TTS: Using ${voices.length} available voices`);
      
      // Create utterance with best voice
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Select best voice (prefer English, local service)
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.localService
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      
      utterance.voice = englishVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      this.log('info', `TTS: Using voice "${englishVoice.name}" (${englishVoice.lang})`);
      
      utterance.onstart = () => {
        isTTSSpeaking = true;
        this.updateStage('speak', 'active');
        this.log('success', `TTS started speaking: "${text}"`);
      };
      
      utterance.onend = () => {
        isTTSSpeaking = false;
        this.updateStage('speak', 'idle');
        this.log('success', 'TTS completed successfully');
      };
      
      utterance.onerror = (event) => {
        this.log('error', `TTS Error: ${event.error}`);
        this.updateStage('speak', 'error');
        isTTSSpeaking = false;
        
        // Provide specific help for TTS errors
        if (event.error === 'network') {
          this.log('error', 'TTS: Network error - check internet connection');
        } else if (event.error === 'synthesis-unavailable') {
          this.log('error', 'TTS: Synthesis unavailable - try refreshing');
        } else if (event.error === 'language-unavailable') {
          this.log('error', 'TTS: Language unavailable - using default voice');
        }
      };
      
      // Cancel any ongoing speech first
      speechSynthesis.cancel();
      
      // Start speaking
      speechSynthesis.speak(utterance);
      this.log('info', 'TTS: Speech synthesis requested');
      
    } catch (error) {
      this.log('error', `TTS Error: ${error.message}`);
      this.updateStage('speak', 'error');
      isTTSSpeaking = false;
    }
  }

  addTTSVoiceHelp() {
    this.log('info', '=== TTS VOICE TROUBLESHOOTING ===');
    this.log('info', 'No TTS voices available. Solutions:');
    this.log('info', '1. Check internet connection (online voices)');
    this.log('info', '2. Try refreshing the page');
    this.log('info', '3. Check browser TTS settings');
    this.log('info', '4. Try a different browser (Chrome works best)');
    this.log('info', '=== END TTS HELP ===');
  }

  
}
registerPipelineMethods(PipelineAudio);

