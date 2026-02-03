chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.target !== 'OFFSCREEN') return;

    if (msg.type === 'START_CAPTURE') {
        log('Received START_CAPTURE with streamId: ' + msg.streamId);
        startCapture(msg.streamId);
    } else if (msg.type === 'STOP_CAPTURE') {
        log('Received STOP_CAPTURE');
        stopCapture();
    }
});

let audioCtx;
let mediaStream;
let processor;

function log(msg) {
    console.log(msg);
    chrome.runtime.sendMessage({ type: 'LOG', message: msg }).catch(() => { });
}

async function startCapture(streamId) {
    try {
        log('Requesting User Media (Tab)...');
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        });
        log('User Media obtained. Tracks: ' + mediaStream.getAudioTracks().length);

        // Create AudioContext at 16000Hz (Vosk requirement)
        audioCtx = new AudioContext({ sampleRate: 16000 });
        log('AudioContext created at ' + audioCtx.sampleRate + 'Hz');
        chrome.runtime.sendMessage({
            type: 'AUDIO_FORMAT',
            audioType: `audio/l16;rate=${audioCtx.sampleRate}`
        }).catch(() => { });

        // Load Worklet
        await audioCtx.audioWorklet.addModule('pcm-processor.js');
        log('Audio Worklet Module Loaded');

        const source = audioCtx.createMediaStreamSource(mediaStream);
        const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');

        workletNode.port.onmessage = (e) => {
            // e.data is the Int16 ArrayBuffer
            // Convert to Base64 to ensure safe transmission via JSON-based messaging
            const base64String = arrayBufferToBase64(e.data);

            chrome.runtime.sendMessage({
                type: 'AUDIO_CHUNK',
                chunk: base64String
            });
        };

        source.connect(workletNode);
        workletNode.connect(audioCtx.destination); // Keep audio playing for user

        processor = workletNode; // Keep reference to stop later

        log('Audio Processing Graph Connected (Worklet). Flowing...');

    } catch (e) {
        log('Offscreen Capture Error: ' + e.toString());
    }
}

function stopCapture() {
    if (processor) {
        processor.disconnect();
        processor = null;
    }
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
    log('Capture stopped and resources released.');
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
