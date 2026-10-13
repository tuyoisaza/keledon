// Tab Audio Capture (for STT from browser tab)
// ==============================
async function populateTabSelector() {
  const tabSelector = document.getElementById('tabSelector');
  if (!tabSelector) return;

  try {
    const tabs = await chrome.tabs.query({});
    tabSelector.innerHTML = '<option value="">Select tab to capture audio...</option>';

    for (const tab of tabs) {
      if (tab.id === chrome.tabs.TAB_ID_NONE) continue;
      const option = document.createElement('option');
      option.value = tab.id;
      option.textContent = tab.title.substring(0, 50) + (tab.title.length > 50 ? '...' : '');
      option.title = tab.url;
      tabSelector.appendChild(option);
    }
    console.log('[KELEDON] Tab selector populated with', tabs.length, 'tabs');
  } catch (err) {
    console.error('[KELEDON] Failed to populate tabs:', err.message);
  }
}

function getBackendUrl() {
  const backendInput = document.getElementById('backendUrl');
  if (backendInput && backendInput.value) {
    return backendInput.value;
  }
  return 'http://localhost:3001';
}

let sttWebSocket = null;
let sttAudioRecorder = null;

async function startWithTabCapture() {
  console.log('[KELEDON] Requesting tab audio capture for STT...');

  const backendUrl = getBackendUrl();
  console.log('[KELEDON] Using backend URL:', backendUrl);

  addMessage('🔄 Connecting to STT service...', 'assistant');

  try {
    // Create a listening session
    const sessionResponse = await fetch(`${backendUrl}/listening-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'tab', tabUrl: 'extension', tabTitle: 'Keledon Extension' })
    });

    if (!sessionResponse.ok) {
      throw new Error(`Session creation failed: ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();
    console.log('[KELEDON] Listening session created:', session);
    addMessage('📡 Session created, starting audio capture...', 'assistant');

    // Use chrome.tabCapture.capture() with callback style
    chrome.tabCapture.capture({
      audio: true,
      video: false
    }, (stream) => {
      if (chrome.runtime.lastError) {
        console.error('[KELEDON] Tab capture error:', chrome.runtime.lastError.message);
        addMessage('❌ Error: ' + chrome.runtime.lastError.message, 'assistant');
        return;
      }

      if (!stream) {
        console.error('[KELEDON] Tab capture returned no stream');
        addMessage('❌ No stream returned', 'assistant');
        return;
      }

      console.log('[KELEDON] Tab audio capture started');

      const wsUrl = session.wsUrl;
      console.log('[KELEDON] Connecting to WebSocket:', wsUrl);

      sttWebSocket = new WebSocket(wsUrl);

      sttWebSocket.onopen = () => {
        console.log('[KELEDON] WebSocket connected');
        addMessage('✅ Connected! Capturing and transcribing audio...', 'assistant');
      };

      sttWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[KELEDON] STT response:', data);

          if (data.text) {
            addMessage(`🎤 "${data.text}"`, 'user');
          }
          if (data.final && data.text) {
            handleCommand(data.text);
          }
        } catch (e) {
          console.log('[KELEDON] STT message:', event.data);
        }
      };

      sttWebSocket.onerror = (error) => {
        console.error('[KELEDON] WebSocket error:', error);
        addMessage('❌ STT connection error', 'assistant');
      };

      sttWebSocket.onclose = (event) => {
        console.log('[KELEDON] WebSocket closed:', event.code);
        addMessage('🔴 STT disconnected', 'assistant');
      };

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);

      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (sttWebSocket && sttWebSocket.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const channelData = inputBuffer.getChannelData(0);

          const pcmData = new Int16Array(channelData.length);
          for (let i = 0; i < channelData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF;
          }

          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          sttWebSocket.send(JSON.stringify({ type: 'AUDIO_CHUNK', audio: base64 }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      window.keledonTabAudioStream = stream;
      window.keledonAudioContext = audioContext;
      window.keledonProcessor = processor;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudio = () => {
        if (!window.keledonTabAudioStream) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (average > 20 && Math.random() < 0.05) {
          console.log(`[KELEDON] Audio level: ${Math.round(average)}`);
        }

        if (window.keledonTabAudioStream) {
          requestAnimationFrame(checkAudio);
        }
      };
      checkAudio();

      console.log('[KELEDON] STT listening started - capturing audio from tab');
      addMessage('🎤 Listening... Speak now!', 'assistant');
    }); // Close tabCapture callback

  } catch (err) {
    console.error('[KELEDON] Tab capture/STT error:', err.message);
    let errorMsg = err.message;
    if (errorMsg.includes('Chrome pages')) {
      errorMsg = 'Cannot capture Chrome pages. Open a regular website (YouTube, etc.) and try again.';
    }
    addMessage('❌ Error: ' + errorMsg, 'assistant');
  }
}


