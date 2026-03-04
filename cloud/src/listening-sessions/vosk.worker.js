const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

console.log('[Worker] ====================================');
console.log('[Worker] Vosk Worker Starting...');
console.log('[Worker] CWD:', process.cwd());
console.log('[Worker] __dirname:', __dirname);

// We import vosk via require since it's a native module.
let vosk;

try {
    // Calculate absolute path to Vosk DLLs
    // Worker runs from dist/, but node_modules is at project root
    const projectRoot = process.cwd(); // c:\Keldon\cloud
    const voskLibPath = path.join(projectRoot, 'node_modules', 'vosk', 'lib', 'win-x86_64');

    console.log('[Worker] Looking for Vosk DLLs at:', voskLibPath);

    if (fs.existsSync(voskLibPath)) {
        // List DLLs to verify they exist
        const files = fs.readdirSync(voskLibPath);
        console.log('[Worker] Found DLL files:', files.join(', '));

        // Prepend to PATH
        const oldPath = process.env.PATH || '';
        process.env.PATH = `${voskLibPath}${path.delimiter}${oldPath}`;
        console.log('[Worker] Added to PATH. First entry:', process.env.PATH.split(path.delimiter)[0]);

        console.log('[Worker] Attempting to require vosk...');
        vosk = require('vosk');
        console.log('[Worker] Vosk module loaded successfully!');
    } else {
        console.error('[Worker] WARNING: Vosk lib path does not exist!');
        throw new Error('Vosk lib path does not exist: ' + voskLibPath);
    }

} catch (e) {
    console.error('[Worker] ====================================');
    console.error('[Worker] FAILED to load vosk module!');
    console.error('[Worker] Error:', e.message);
    console.error('[Worker] Stack:', e.stack);
    console.error('[Worker] ====================================');

    if (parentPort) {
        parentPort.postMessage({ type: 'ERROR', error: 'Vosk module load failed: ' + e.message });
    } else if (process.send) {
        process.send({ type: 'ERROR', error: 'Vosk module load failed: ' + e.message });
    }
    process.exit(1);
}

// Redirect Vosk logs to nothing to keep console clean, or to a specific log level
vosk.setLogLevel(-1);

// Select model based on language
const language = workerData.language || 'en';
const modelName = language === 'es' ? 'vosk-model-small-es-0.42' : 'vosk-model-small-en-us-0.15';
const MODEL_PATH = path.resolve(__dirname, '../../models', modelName);

console.log(`[Worker] Selected Language: ${language}, Model: ${modelName}`);

if (!fs.existsSync(MODEL_PATH)) {
    console.error(`Model not found at ${MODEL_PATH}`);
    // Provide a clear error
    parentPort?.postMessage({ type: 'ERROR', error: 'Model not found on server' });
    // Don't exit yet, maybe they fix it? But really we should.
}

let model;
let recognizer;

try {
    console.log('[Worker] Loading model...');
    model = new vosk.Model(MODEL_PATH);
    recognizer = new vosk.Recognizer({ model: model, sampleRate: 16000 });
    console.log('[Worker] Model loaded.');
    parentPort?.postMessage({ type: 'READY' });
} catch (e) {
    console.error('[Worker] Failed to init model:', e);
    parentPort?.postMessage({ type: 'ERROR', error: 'Model init failed' });
}

parentPort?.on('message', (msg) => {
    if (msg.type === 'AUDIO') {
        if (!recognizer) {
            console.log('[Worker] Dropping audio: No recognizer');
            return;
        }

        // Data is expected to be a buffer (Int16 PCM)
        try {
            // Verify buffer
            let buffer = msg.data;
            if (typeof buffer === 'string') {
                buffer = Buffer.from(buffer, 'base64');
            } else if (!Buffer.isBuffer(buffer)) {
                // If it behaves like an array/view, convert it
                buffer = Buffer.from(buffer);
            }

            if (workerData.debug && Math.random() < 0.05) {
                // Inspect first few samples to see if it's silence
                const firstSamples = buffer.subarray(0, 10);
                console.log(`[Worker] Processing chunk: ${buffer.length} bytes. Sample start: [${Array.from(firstSamples).join(', ')}]`);
            }

            if (recognizer.acceptWaveform(buffer)) {
                const result = recognizer.result();
                if (result.text && result.text.length > 0) {
                    parentPort.postMessage({ type: 'FINAL', text: result.text });
                }
            } else {
                const partial = recognizer.partialResult();
                if (partial.partial && partial.partial.length > 0) {
                    parentPort.postMessage({ type: 'PARTIAL', text: partial.partial });
                }
            }
        } catch (err) {
            console.error('[Worker] Audio processing error:', err);
        }
    } else if (msg.type === 'STOP') {
        if (recognizer) {
            const final = recognizer.finalResult();
            if (final.text) {
                parentPort.postMessage({ type: 'FINAL', text: final.text });
            }
            // recognizer.free(); // Removed to avoid potential segfault on Windows/FFI
        }
        // if (model) model.free(); // Removed to avoid potential segfault
        process.exit(0);
    }
});
