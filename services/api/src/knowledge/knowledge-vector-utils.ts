import { createHash } from 'crypto';

export function chunkContent(
  content: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + chunkSize);
    const slice = normalized.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= normalized.length) break;
    start = Math.max(end - chunkOverlap, start + 1);
  }
  return chunks;
}

export function textToVector(text: string): number[] {
  const hash = createHash('sha256').update(text).digest();
  const vector = new Array<number>(768);
  for (let index = 0; index < vector.length; index += 1) {
    vector[index] = hash[index % hash.length] / 255;
  }
  return vector;
}

export function getChunkPointId(
  documentId: string,
  chunkIndex: number,
): string {
  const digest = createHash('sha256')
    .update(`${documentId}:chunk:${chunkIndex + 1}`)
    .digest('hex')
    .slice(0, 32);
  const uuid = digest.split('');
  uuid[12] = '8'; // RFC 9562 custom UUID version
  uuid[16] = ((parseInt(uuid[16], 16) & 0x3) | 0x8).toString(16);
  return `${uuid.slice(0, 8).join('')}-${uuid.slice(8, 12).join('')}-${uuid
    .slice(12, 16)
    .join('')}-${uuid.slice(16, 20).join('')}-${uuid.slice(20).join('')}`;
}

export function normalizeChunkSize(chunkSize?: number): number {
  if (typeof chunkSize !== 'number' || !Number.isFinite(chunkSize)) return 900;
  return Math.min(4000, Math.max(200, Math.floor(chunkSize)));
}

export function normalizeChunkOverlap(
  chunkOverlap: number | undefined,
  chunkSize: number,
): number {
  if (typeof chunkOverlap !== 'number' || !Number.isFinite(chunkOverlap)) {
    return Math.min(120, Math.floor(chunkSize / 4));
  }
  return Math.max(
    0,
    Math.min(Math.floor(chunkOverlap), Math.floor(chunkSize / 2)),
  );
}
