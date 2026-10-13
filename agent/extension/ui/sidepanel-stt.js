// Phase O/N-2: Real STT Implementation
// ==============================

function initializeSTT(voiceBtn, commandInput) {
  console.log('[KELEDON] Initializing STT...');

  // Check if Web Speech API is supported
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('[KELEDON] STT not supported in this browser');
    addMessage('❌ STT not supported in this browser', 'assistant');

    // Update UI to show STT unavailable
    updateSTTStatus('unsupported');
    return;
  }

  // Create SpeechRecognition instance
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  sttRecognition = new SpeechRecognition();

  // Configure STT
  sttRecognition.continuous = false;
  sttRecognition.interimResults = true;
  sttRecognition.lang = 'en-US';
  sttRecognition.maxAlternatives = 1;

  // Setup event handlers
  sttRecognition.onstart = () => {
    console.log('[KELEDON] STT listening started');
    isSTTListening = true;
    updateSTTStatus('listening');
    addMessage('🎤 Listening...', 'assistant');

    if (voiceBtn) {
      voiceBtn.classList.add('recording');
      voiceBtn.textContent = '📝';
    }
  };

  sttRecognition.onresult = (event) => {
    console.log('[KELEDON] STT result:', event);

    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (finalTranscript) {
      console.log('[KELEDON] Final transcript:', finalTranscript);
      addMessage(`🎤 "${finalTranscript}"`, 'user');

      // Update command input with transcript
      if (commandInput) {
        commandInput.value = finalTranscript;
      }

      // Stop listening after final result
      stopSTTListening();
    } else if (interimTranscript) {
      console.log('[KELEDON] Interim transcript:', interimTranscript);
      // Could show interim results in UI if desired
    }
  };

  sttRecognition.onerror = (event) => {
    console.error('[KELEDON] STT error:', event.error);

    // If permission denied, try tab capture instead
    if (event.error === 'not-allowed' || event.error === 'audio-capture') {
      console.warn('[KELEDON] STT permission denied, trying tab audio capture...');
      startWithTabCapture();
      return;
    }

    let errorMessage = '❌ STT error';
    switch (event.error) {
      case 'no-speech':
        errorMessage = '❌ No speech detected';
        break;
      case 'audio-capture':
        errorMessage = '❌ Microphone not available';
        break;
      case 'not-allowed':
        errorMessage = '❌ Microphone permission denied';
        break;
      case 'network':
        errorMessage = '❌ Network error';
        break;
      default:
        errorMessage = `❌ STT error: ${event.error}`;
    }

    addMessage(errorMessage, 'assistant');
    stopSTTListening();
  };

  sttRecognition.onend = () => {
    console.log('[KELEDON] STT listening ended');
    stopSTTListening();
  };

  console.log('[KELEDON] STT initialized successfully');
  addMessage('✅ STT initialized', 'assistant');
  updateSTTStatus('ready');
}

function startSTTListening() {
  if (!agentActive) {
    addMessage('❌ Agent is inactive - STT disabled', 'assistant');
    return;
  }

  if (!sttRecognition) {
    addMessage('❌ STT not initialized', 'assistant');
    return;
  }

  if (isSTTListening) {
    console.log('[KELEDON] STT already listening');
    return;
  }

  isSTTListening = true;
  updateSTTStatus('listening');

  const voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) {
    voiceBtn.classList.add('recording');
    voiceBtn.textContent = '🛑';
  }

  // Use tab capture with backend STT
  startWithTabCapture();
}

function stopSTTListening() {
  if (!isSTTListening) {
    return;
  }

  isSTTListening = false;
  updateSTTStatus('ready');

  const voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) {
    voiceBtn.classList.remove('recording');
    voiceBtn.textContent = '📝';
  }

  // Stop the tab capture and WebSocket
  if (window.keledonProcessor) {
    window.keledonProcessor.disconnect();
    window.keledonProcessor = null;
  }
  if (window.keledonTabAudioStream) {
    window.keledonTabAudioStream.getTracks().forEach(track => track.stop());
    window.keledonTabAudioStream = null;
  }
  if (sttWebSocket) {
    sttWebSocket.close();
    sttWebSocket = null;
  }
  addMessage('⏹️ STT stopped', 'assistant');
}

// Phase O/N-2/3: Real STT/TTS implementation

function updateSTTStatus(status) {
  const sttStatus = document.getElementById('sttStatus');
  if (!sttStatus) return;

  // Remove all status classes
  sttStatus.className = 'status-dot';

  // Apply appropriate status
  switch (status) {
    case 'listening':
      sttStatus.className = 'status-dot listening';
      break;
    case 'ready':
      sttStatus.className = 'status-dot ready';
      break;
    case 'error':
      sttStatus.className = 'status-dot error';
      break;
    case 'unsupported':
      sttStatus.className = 'status-dot error';
      break;
    default:
      sttStatus.className = 'status-dot';
  }

  console.log('[KELEDON] STT status updated to:', status);
}

// ==============================

