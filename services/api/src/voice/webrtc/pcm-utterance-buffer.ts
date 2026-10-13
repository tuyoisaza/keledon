/** Bounded 16-bit PCM utterance segmentation and WAV encoding; no provider operations. */
export class PcmUtteranceBuffer {
  private chunks: Buffer[] = [];
  private frames = 0;
  private silentFrames = 0;
  private sampleRate = 0;
  private channels = 0;
  constructor(private readonly emit: (wav: Buffer) => void) {}
  push(samples: Int16Array, sampleRate: number, channels: number): void {
    if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000 || ![1, 2].includes(channels) || samples.length > sampleRate * channels) return;
    if (this.frames && (sampleRate !== this.sampleRate || channels !== this.channels)) this.reset();
    let energy = 0;
    for (const sample of samples) energy += sample * sample;
    const audible = Math.sqrt(energy / Math.max(samples.length, 1)) > 300;
    if (!this.frames && !audible) return;
    this.sampleRate = sampleRate; this.channels = channels;
    const bytes = Buffer.alloc(samples.length * 2);
    samples.forEach((sample, i) => bytes.writeInt16LE(sample, i * 2));
    this.chunks.push(bytes); this.frames += samples.length / channels;
    this.silentFrames = audible ? 0 : this.silentFrames + samples.length / channels;
    if (this.frames >= sampleRate * 10 || this.silentFrames >= sampleRate * 0.6) this.flush();
  }
  reset(): void { this.chunks = []; this.frames = 0; this.silentFrames = 0; }
  flush(): void {
    if (!this.frames) return;
    const pcm = Buffer.concat(this.chunks);
    const header = Buffer.alloc(44);
    header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVE', 8);
    header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
    header.writeUInt16LE(this.channels, 22); header.writeUInt32LE(this.sampleRate, 24);
    header.writeUInt32LE(this.sampleRate * this.channels * 2, 28); header.writeUInt16LE(this.channels * 2, 32);
    header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
    this.reset(); this.emit(Buffer.concat([header, pcm]));
  }
}
