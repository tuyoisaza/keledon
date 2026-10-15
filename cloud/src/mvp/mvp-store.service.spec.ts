import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MvpStoreService } from './mvp-store.service';

describe('MvpStoreService persisted data validation', () => {
  const previousDataDir = process.env.KELEDON_DATA_DIR;
  let dataDir: string;

  afterEach(() => {
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
    if (previousDataDir === undefined) delete process.env.KELEDON_DATA_DIR;
    else process.env.KELEDON_DATA_DIR = previousDataDir;
  });

  it('keeps valid entries and rejects malformed records and credential config', () => {
    dataDir = mkdtempSync(join(tmpdir(), 'keledon-mvp-store-'));
    process.env.KELEDON_DATA_DIR = dataDir;
    writeFileSync(
      join(dataDir, 'mvp-store.json'),
      JSON.stringify({
        interfaces: [
          {
            id: 'if-1',
            name: 'CRM',
            baseUrl: 'https://crm.example.test',
            base_url: 'https://crm.example.test',
            category: 'case',
            status: 'connected',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          { id: 'invalid', status: 'connected' },
        ],
        flowDefinitions: [
          {
            id: 'flow-1',
            name: 'Lookup',
            intentTags: ['lookup'],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          { id: 'invalid', intentTags: 'not-an-array' },
        ],
        ttsConfig: { apiKey: 'invalid-shape' },
      }),
      'utf8',
    );

    const store = new MvpStoreService();

    expect(store.getInterfaces().map(({ id }) => id)).toEqual(['if-1']);
    expect(store.getTTSConfig().providerId).toBe('webspeech');
  });
});
