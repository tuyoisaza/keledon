class PipelineWebrtc {
// STEP D: Truthful WebRTC Detection
  // ==============================
  
  initializeWebRTCDetection() {
    this.log('info', 'Initializing WebRTC detection system...');
    
    // Start continuous detection
    this.startWebRTCDetection();
    
    // Add re-scan button to WebRTC control
    this.addWebRTCRescanButton();
    
    this.log('info', 'WebRTC detection system initialized');
  }

  startWebRTCDetection() {
    // Clear any existing detection interval
    if (this.webrtcDetectionInterval) {
      clearInterval(this.webrtcDetectionInterval);
    }
    
    // Check every 3 seconds for WebRTC streams
    this.webrtcDetectionInterval = setInterval(() => {
      this.detectWebRTCInActiveTab();
    }, 3000);
    
    // Initial detection
    this.detectWebRTCInActiveTab();
  }

  async detectWebRTCInActiveTab() {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.log('warning', 'No active tab found for WebRTC detection');
        this.updateWebRTCState(false, 'No active tab');
        return;
      }

      // Check if we can access the tab
      if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        this.log('info', `Tab ${tab.url} not accessible for WebRTC detection`);
        this.updateWebRTCState(false, 'Tab not HTTP/HTTPS');
        return;
      }

      // Inject content script to detect WebRTC
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: this.detectWebRTCInPage
      });

      if (results && results.length > 0) {
        const detectionResult = results[0].result;
        
        if (detectionResult && detectionResult.hasWebRTC) {
          this.log('success', `WebRTC detected in tab: ${detectionResult.details}`);
          this.updateWebRTCState(true, detectionResult.details);
        } else {
          this.log('info', 'No WebRTC detected in active tab');
          this.updateWebRTCState(false, 'No WebRTC streams found');
        }
      } else {
        this.log('warning', 'Failed to execute WebRTC detection script');
        this.updateWebRTCState(false, 'Detection script failed');
      }
    } catch (error) {
      this.log('error', `WebRTC detection failed: ${error.message}`);
      this.updateWebRTCState(false, `Detection error: ${error.message}`);
    }
  }

  detectWebRTCInPage() {
    const webRTCElements = [];
    let hasWebRTC = false;
    let details = '';

    try {
      // Check for <video> elements with srcObject (WebRTC streams)
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject && video.srcObject instanceof MediaStream) {
          hasWebRTC = true;
          webRTCElements.push({
            type: 'video',
            element: 'video',
            hasStream: true,
            streamId: video.srcObject.id || 'unknown',
            audioTracks: video.srcObject.getAudioTracks().length,
            videoTracks: video.srcObject.getVideoTracks().length
          });
        }
      });

      // Check for <audio> elements with srcObject (WebRTC audio streams)
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (audio.srcObject && audio.srcObject instanceof MediaStream) {
          hasWebRTC = true;
          webRTCElements.push({
            type: 'audio',
            element: 'audio',
            hasStream: true,
            streamId: audio.srcObject.id || 'unknown',
            audioTracks: audio.srcObject.getAudioTracks().length
          });
        }
      });

      // Check for RTCPeerConnection usage (heuristic)
      if (window.RTCPeerConnection || window.webkitRTCPeerConnection) {
        // Look for common WebRTC meeting indicators
        const meetingIndicators = [
          '[data-testid="call-container"]',
          '[data-testid="meeting-controls"]',
          '.webrtc-video',
          '.rtc-video',
          '[data-rtc-connection]'
        ];
        
        meetingIndicators.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            hasWebRTC = true;
            webRTCElements.push({
              type: 'meeting-indicator',
              element: selector,
              count: elements.length
            });
          }
        });
      }

      details = webRTCElements.length > 0 
        ? `Found ${webRTCElements.length} WebRTC element(s): ${webRTCElements.map(e => `${e.element}(${e.audioTracks || 0} audio tracks)`).join(', ')}`
        : 'No WebRTC elements found';

    } catch (error) {
      details = `Detection error: ${error.message}`;
    }

    return {
      hasWebRTC,
      details,
      elements: webRTCElements,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
  }

  updateWebRTCState(detected, reason) {
    const wasDetected = webRTCState.detected;
    webRTCState.detected = detected;
    webRTCState.detectionReason = reason;

    // Update WebRTC button state
    const webrtcBtn = document.getElementById('webrtc-btn');
    if (webrtcBtn) {
      if (detected) {
        webrtcBtn.classList.add('active');
        webrtcBtn.title = `WebRTC detected: ${reason}`;
      } else {
        webrtcBtn.classList.remove('active');
        webrtcBtn.title = `WebRTC not detected: ${reason}`;
      }
    }

    // Update listen stage based on WebRTC detection
    if (detected) {
      this.updateStage('listen', webRTCState.listening ? 'active' : 'ready');
      this.log('success', `WebRTC detected - Listen stage ready: ${reason}`);
    } else {
      this.updateStage('listen', 'idle');
      this.log('info', `WebRTC not detected - Listen stage idle: ${reason}`);
    }

    // Log state changes
    if (wasDetected !== detected) {
      this.log(detected ? 'success' : 'info', `WebRTC detection state changed: ${detected ? 'DETECTED' : 'NOT DETECTED'} - ${reason}`);
    }

    // Update truth state
    this.updateStageFromTruth();
  }

  async startWebRTCListening() {
    if (!webRTCState.detected) {
      this.log('error', 'Cannot start WebRTC listening - no WebRTC detected');
      return;
    }

    if (webRTCState.listening) {
      this.log('warning', 'WebRTC listening already active');
      return;
    }

    try {
      this.log('info', 'Starting WebRTC audio capture...');
      
      // Get WebRTC audio stream from active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab');
      }

      // Use tab capture API to get audio from the tab
      const stream = await chrome.tabCapture.capture({
        audio: true,
        video: false
      });

      if (!stream) {
        throw new Error('Failed to capture tab audio');
      }

      webRTCState.stream = stream;
      webRTCState.listening = true;

      // Set up audio processing to prove frames are arriving
      this.setupWebRTCAudioProcessing(stream);

      this.updateWebRTCState(true, 'WebRTC audio capture active');
      this.log('success', 'WebRTC listening started - capturing tab audio');
      
      // Update UI
      this.updateStage('listen', 'active');
      this.updateStage('transcribe', 'active');
      
    } catch (error) {
      this.log('error', `Failed to start WebRTC listening: ${error.message}`);
      this.updateStage('listen', 'error');
    }
  }

  setupWebRTCAudioProcessing(stream) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create script processor to monitor audio frames
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      let frameCount = 0;
      let lastFrameLog = Date.now();
      
      processor.onaudioprocess = (event) => {
        frameCount++;
        const now = Date.now();
        
        // Log frame statistics every 5 seconds
        if (now - lastFrameLog > 5000) {
          this.log('info', `WebRTC audio frames: ${frameCount} frames in last 5s`);
          frameCount = 0;
          lastFrameLog = now;
        }
        
        // Get audio data for processing
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Here you would connect to STT pipeline
        // For now, we just prove frames are arriving
      };
      
      // Connect the audio pipeline
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      webRTCState.processor = processor;
      
      this.log('success', 'WebRTC audio processing pipeline established');
      
    } catch (error) {
      this.log('error', `Failed to setup WebRTC audio processing: ${error.message}`);
    }
  }

  stopWebRTCListening() {
    if (!webRTCState.listening) {
      this.log('warning', 'WebRTC listening not active');
      return;
    }

    if (webRTCState.stream) {
      webRTCState.stream.getTracks().forEach(track => track.stop());
      webRTCState.stream = null;
    }

    if (webRTCState.processor) {
      webRTCState.processor.disconnect();
      webRTCState.processor = null;
    }

    webRTCState.listening = false;
    this.updateWebRTCState(webRTCState.detected, webRTCState.detectionReason);
    
    this.updateStage('listen', 'ready');
    this.updateStage('transcribe', 'idle');
    
    this.log('info', 'WebRTC listening stopped');
  }

  addWebRTCRescanButton() {
    // Add re-scan button to WebRTC controls
    const listenStage = document.getElementById('listen-stage');
    if (!listenStage) return;
    
    // Check if re-scan button already exists
    if (document.getElementById('webrtc-rescan-btn')) {
      return;
    }
    
    const rescanBtn = document.createElement('button');
    rescanBtn.id = 'webrtc-rescan-btn';
    rescanBtn.className = 'control-btn';
    rescanBtn.textContent = '🔄';
    rescanBtn.title = 'Re-scan WebRTC';
    
    rescanBtn.addEventListener('click', () => {
      this.log('info', 'Manual WebRTC re-scan requested by user');
      this.detectWebRTCInActiveTab();
    });
    
    // Add to stage controls
    const stageControls = listenStage.querySelector('.stage-controls');
    if (stageControls) {
      stageControls.appendChild(rescanBtn);
      this.log('info', 'WebRTC re-scan button added to listen stage');
    }
  }


}
registerPipelineMethods(PipelineWebrtc);

