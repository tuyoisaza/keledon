import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CrudSeedService } from './crud-seed.service';

describe('CrudSeedService role policy', () => {
  it('ignores imported role values when creating user accounts', async () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'keledon-crud-seed-'),
    );
    const seedPath = path.join(directory, 'crud.json');
    fs.writeFileSync(
      seedPath,
      JSON.stringify({
        companies: [],
        brands: [],
        teams: [],
        users: [
          {
            email: 'invitee@example.test',
            role: 'superadmin',
            name: 'Invitee',
          },
        ],
      }),
      'utf8',
    );
    const userCreate = jest.fn().mockResolvedValue({ id: 'user-a' });
    const prisma = {
      company: { findFirst: jest.fn() },
      brand: { findFirst: jest.fn() },
      team: { findFirst: jest.fn() },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: userCreate,
      },
    } as unknown as PrismaService;

    try {
      const service: CrudSeedService = Object.assign(
        new CrudSeedService(prisma),
        {
          seedDataPath: seedPath,
        },
      );

      await service.seedFromCrudJson();

      expect(userCreate).toHaveBeenCalledWith({
        data: {
          email: 'invitee@example.test',
          name: 'Invitee',
          role: 'user',
          companyId: null,
          teamId: null,
        },
      });
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
