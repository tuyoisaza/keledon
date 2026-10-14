import type { User } from '@prisma/client';

export type CrudRequestContext = {
  companyScope?: string;
  actor: Pick<User, 'id' | 'role' | 'companyId' | 'teamId'>;
};
