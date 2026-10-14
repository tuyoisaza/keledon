import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from './prisma.service';

describe('PrismaService auto seed role policy', () => {
  const tempDirectories: string[] = [];
  afterEach(() => {
    for (const directory of tempDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  function writeSeedFile(data: unknown): string {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'keledon-seed-'));
    tempDirectories.push(directory);
    const seedPath = path.join(directory, 'crud.json');
    fs.writeFileSync(seedPath, JSON.stringify(data), 'utf8');
    return seedPath;
  }

  it('creates imported accounts as users regardless of a supplied elevated role', async () => {
    const seedDataPath = writeSeedFile({
      companies: [],
      brands: [],
      teams: [],
      users: [
        {
          email: 'imported@example.test',
          role: 'superadmin',
          company_name: 'Acme',
          team_name: 'Sales',
        },
      ],
    });

    const userCreate = jest.fn().mockResolvedValue({ id: 'user-a' });
    const service = Object.assign(Object.create(PrismaService.prototype), {
      company: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({ id: 'company-a' }),
      },
      brand: { findFirst: jest.fn() },
      team: {
        findFirst: jest.fn().mockResolvedValue({ id: 'team-a' }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: userCreate,
      },
      seedDataPath,
    }) as PrismaService;

    await (
      service as unknown as { autoSeedIfEmpty: () => Promise<void> }
    ).autoSeedIfEmpty();

    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: 'imported@example.test',
        name: 'imported',
        role: 'user',
        companyId: 'company-a',
        teamId: 'team-a',
      },
    });
  });

  it('ignores malformed or overlong seed records instead of persisting them', async () => {
    const seedDataPath = writeSeedFile({
      companies: [null, { name: 'x'.repeat(256) }, { name: 'Valid' }],
      brands: 'not-an-array',
      teams: [{ name: 42 }],
      users: [{ email: 'not-an-email' }],
    });

    const companyCreate = jest.fn().mockResolvedValue({ id: 'company-a' });
    const userCreate = jest.fn();
    const service = Object.assign(Object.create(PrismaService.prototype), {
      company: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: companyCreate,
      },
      brand: { findFirst: jest.fn(), create: jest.fn() },
      team: { findFirst: jest.fn(), create: jest.fn() },
      user: { findFirst: jest.fn(), create: userCreate },
      seedDataPath,
    }) as PrismaService;

    await (
      service as unknown as { autoSeedIfEmpty: () => Promise<void> }
    ).autoSeedIfEmpty();

    expect(companyCreate).toHaveBeenCalledTimes(1);
    expect(companyCreate).toHaveBeenCalledWith({
      data: { name: 'Valid', industry: null },
    });
    expect(userCreate).not.toHaveBeenCalled();
  });
});
