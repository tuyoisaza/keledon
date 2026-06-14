/**
 * Estimate WAV audio duration from raw RIFF structure.
 * Returns duration in seconds, or null if not a valid WAV.
 */
export function estimateWavDuration(audioData: Buffer): number | null {
  if (audioData.length < 44) return null;
  if (audioData.subarray(0, 4).toString('ascii') !== 'RIFF') return null;
  if (audioData.subarray(8, 12).toString('ascii') !== 'WAVE') return null;

  let pos = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (pos + 8 <= audioData.length) {
    const chunkId = audioData.subarray(pos, pos + 4).toString('ascii');
    const declaredSize = audioData.readUInt32LE(pos + 4);
    const payloadStart = pos + 8;
    const payloadRemaining = Math.max(0, audioData.length - payloadStart);
    const chunkSize =
      declaredSize === 0xffffffff || declaredSize > payloadRemaining
        ? payloadRemaining
        : declaredSize;
    if (
      chunkId === 'fmt ' &&
      chunkSize >= 16 &&
      payloadStart + 12 <= audioData.length
    ) {
      byteRate = audioData.readUInt32LE(payloadStart + 8);
    }
    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    pos = payloadStart + chunkSize + (chunkSize % 2);
  }

  return byteRate > 0 && dataSize > 0 ? dataSize / byteRate : null;
}

/**
 * Fix WAV RIFF header sizes to match actual byte length.
 * Speaches sometimes returns incorrect RIFF chunk sizes.
 */
export function finalizeWavHeader(audioData: Buffer): Buffer {
  if (audioData.length < 44) return audioData;
  if (audioData.subarray(0, 4).toString('ascii') !== 'RIFF') return audioData;
  if (audioData.subarray(8, 12).toString('ascii') !== 'WAVE') return audioData;

  const fixed = Buffer.from(audioData);
  let changed = false;
  const riffSize = Math.max(0, fixed.length - 8);
  if (fixed.readUInt32LE(4) !== riffSize) {
    fixed.writeUInt32LE(riffSize, 4);
    changed = true;
  }

  let pos = 12;
  while (pos + 8 <= fixed.length) {
    const chunkId = fixed.subarray(pos, pos + 4).toString('ascii');
    const declaredSize = fixed.readUInt32LE(pos + 4);
    const payloadStart = pos + 8;
    const payloadRemaining = Math.max(0, fixed.length - payloadStart);
    if (chunkId === 'data') {
      if (declaredSize !== payloadRemaining) {
        fixed.writeUInt32LE(payloadRemaining, pos + 4);
        changed = true;
      }
      break;
    }
    const chunkSize =
      declaredSize === 0xffffffff || declaredSize > payloadRemaining
        ? payloadRemaining
        : declaredSize;
    pos = payloadStart + chunkSize + (chunkSize % 2);
  }

  return changed ? fixed : audioData;
}

/**
 * Estimate audio duration from byte count using a fixed bitrate.
 */
export function estimateDuration(bytes: number): number {
  const bitrate = 128000;
  return (bytes * 8) / bitrate;
}

/**
 * Estimate audio duration from a Buffer, preferring WAV metadata if available.
 */
export function estimateWavOrCompressedDuration(audioData: Buffer): number {
  const wavDuration = estimateWavDuration(audioData);
  if (wavDuration !== null) return wavDuration;
  return estimateDuration(audioData.length);
}
