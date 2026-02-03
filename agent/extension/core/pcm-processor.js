class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bytesWritten = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;

        const channelData = input[0]; // Mono or Left channel

        // Fill buffer
        for (let i = 0; i < channelData.length; i++) {
            this.buffer[this.bytesWritten++] = channelData[i];

            // When buffer full, flush
            if (this.bytesWritten >= this.bufferSize) {
                this.flush();
            }
        }

        return true;
    }

    flush() {
        // Send data to main thread (offscreen.js)
        // We send Float32 and let main thread convert to Int16 
        // OR we could convert here if we want, but TextEncoder/DataView might be limited in Worklet scope?
        // Actually DataView works in Worklet. Let's do conversion here for max performance.

        const int16Buffer = new Int16Array(this.bufferSize);
        for (let i = 0; i < this.bufferSize; i++) {
            let s = Math.max(-1, Math.min(1, this.buffer[i]));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            int16Buffer[i] = s;
        }

        this.port.postMessage(int16Buffer.buffer, [int16Buffer.buffer]);

        // Reset
        this.bytesWritten = 0;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
