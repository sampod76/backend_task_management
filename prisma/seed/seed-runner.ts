import { PrismaClient } from '../../src/generated/prisma/client';
import { assertRequiredSeedTablesExist } from './helpers/schema-preflight.helper';
import { seedAdminUsers } from './seeders/admin-users.seeder';

export async function runSeeders(prisma: PrismaClient): Promise<void> {
  await assertRequiredSeedTablesExist(prisma);

  await prisma.$transaction(async (tx) => {
    await seedAdminUsers(tx);
  });
}
