import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabasePersistenceService } from './database-persistence.service';

describe('DatabasePersistenceService disk persistence', () => {
  const originalDirectory = process.cwd();
  const originalType = process.env.DB_TYPE;
  let temporaryDirectory: string;
  let services: DatabasePersistenceService[];

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'keledon-persistence-test-'),
    );
    process.chdir(temporaryDirectory);
    process.env.DB_TYPE = 'file';
    services = [];
  });

  afterEach(async () => {
    for (const service of services) service.onModuleDestroy();
    process.chdir(originalDirectory);
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  afterAll(() => {
    if (originalType === undefined) delete process.env.DB_TYPE;
    else process.env.DB_TYPE = originalType;
  });

  async function createService(): Promise<DatabasePersistenceService> {
    const service = new DatabasePersistenceService();
    services.push(service);
    await service.onModuleInit();
    return service;
  }

  it('round-trips persisted entities, dates and backups, and rejects path traversal', async () => {
    const service = await createService();
    const expiresAt = new Date(Date.now() + 60_000);

    await service.store(
      'customers',
      { label: 'synthetic' },
      { id: 'customer-1', expiresAt, tags: ['test'] },
    );

    const filePath = path.join(
      temporaryDirectory,
      'data',
      `${encodeURIComponent('customers:customer-1')}.json`,
    );
    await expect(stat(filePath)).resolves.toBeDefined();
    const storedJson: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    expect(storedJson).toMatchObject({ data: { label: 'synthetic' } });

    const restarted = await createService();
    const restoredEntity = await restarted.retrieve<{ label: string }>(
      'customers',
      'customer-1',
    );
    expect(restoredEntity?.data.label).toBe('synthetic');
    expect(restoredEntity?.createdAt).toBeInstanceOf(Date);
    expect(restoredEntity?.expiresAt).toBeInstanceOf(Date);

    const backup = await restarted.createBackup('full');
    expect(backup.status).toBe('completed');
    await restarted.delete('customers', 'customer-1');
    expect(await restarted.restoreFromBackup(backup.id)).toBe(true);
    expect(await restarted.retrieve('customers', 'customer-1')).not.toBeNull();

    await expect(
      restarted.store('customers', { label: 'blocked' }, { id: '../escape' }),
    ).rejects.toThrow('Invalid id');
    await expect(
      stat(path.join(temporaryDirectory, 'escape.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
