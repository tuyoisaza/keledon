// Phase O/N-3: Real TTS Implementation
// ==============================

function initializeTTS() {
  console.log('[KELEDON] Initializing TTS...');

  // Check if speechSynthesis is available
  if (!('speechSynthesis' in window)) {
    console.error('[KELEDON] TTS not supported in this browser');
    addMessage('❌ TTS not supported in this browser', 'assistant');
    updateTTSStatus('unsupported');
    return;
  }

  // Test TTS by getting voices
  const loadVoices = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      console.log('[KELEDON] TTS voices available:', voices.length);
      addMessage(`✅ TTS ready (${voices.length} voices)`, 'assistant');
      updateTTSStatus('ready');
    } else {
      // Chrome loads voices asynchronously - don't show error, just log
      console.log('[KELEDON] TTS: Voices loading asynchronously...');
      updateTTSStatus('ready'); // Still mark as ready - Chrome will load on demand
    }
  };

  // Chrome loads voices asynchronously - try immediately and on callback
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Initial voice load attempt
  loadVoices();

  // Retry after delay if no voices loaded (Chrome extension context)
  if (speechSynthesis.getVoices().length === 0) {
    setTimeout(() => {
      loadVoices();
    }, 1000);
  }

  console.log('[KELEDON] TTS initialization started');
}

function speakText(text) {
  if (!agentActive) {
    addMessage('❌ Agent is inactive - TTS disabled', 'assistant');
    return Promise.resolve(false);
  }

  if (!('speechSynthesis' in window)) {
    addMessage('❌ TTS not available', 'assistant');
    return Promise.resolve(false);
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);

  // Configure utterance
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    // Prefer English voices
    const englishVoice = voices.find(voice =>
      voice.lang.startsWith('en') && voice.localService
    ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    utterance.voice = englishVoice;
  }

  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Setup event handlers
  utterance.onstart = () => {
    console.log('[KELEDON] TTS started speaking:', text);
    isTTSSpeaking = true;
    updateTTSStatus('speaking');
    addMessage(`🔊 Speaking: "${text}"`, 'assistant');
  };

  utterance.onend = () => {
    console.log('[KELEDON] TTS finished speaking');
    isTTSSpeaking = false;
    updateTTSStatus('ready');
  };

  utterance.onerror = (event) => {
    console.error('[KELEDON] TTS error:', event.error);
    isTTSSpeaking = false;
    updateTTSStatus('error');

    let errorMessage = '❌ TTS error';
    switch (event.error) {
      case 'network':
        errorMessage = '❌ TTS network error';
        break;
      case 'synthesis-unavailable':
        errorMessage = '❌ TTS synthesis unavailable';
        break;
      case 'language-unavailable':
        errorMessage = '❌ TTS language unavailable';
        break;
      default:
        errorMessage = `❌ TTS error: ${event.error}`;
    }

    addMessage(errorMessage, 'assistant');
  };

  // Start speaking
  try {
    speechSynthesis.speak(utterance);
    console.log('[KELEDON] TTS speak requested for:', text);
    return Promise.resolve(true);
  } catch (error) {
    console.error('[KELEDON] Failed to start TTS:', error);
    addMessage('❌ Failed to start TTS', 'assistant');
    return Promise.resolve(false);
  }
}

function stopTTS() {
  if (!isTTSSpeaking) {
    return;
  }

  try {
    speechSynthesis.cancel();
    console.log('[KELEDON] TTS stop requested');
    isTTSSpeaking = false;
    updateTTSStatus('ready');
  } catch (error) {
    console.warn('[KELEDON] TTS stop error:', error);
  }
}

function updateTTSStatus(status) {
  const ttsStatus = document.getElementById('ttsStatus');
  if (!ttsStatus) return;

  // Remove all status classes
  ttsStatus.className = 'status-dot';

  // Apply appropriate status
  switch (status) {
    case 'speaking':
      ttsStatus.className = 'status-dot speaking';
      break;
    case 'ready':
      ttsStatus.className = 'status-dot ready';
      break;
    case 'error':
      ttsStatus.className = 'status-dot error';
      break;
    case 'unsupported':
      ttsStatus.className = 'status-dot error';
      break;
    default:
      ttsStatus.className = 'status-dot';
  }

  console.log('[KELEDON] TTS status updated to:', status);
}

// ==============================

