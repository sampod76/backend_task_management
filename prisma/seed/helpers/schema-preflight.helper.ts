import { PrismaClient } from '../../../src/generated/prisma/client';

type SeedTableCheckResult = {
  usersTable: string | null;
  adminsTable: string | null;
};

export async function assertRequiredSeedTablesExist(
  prisma: PrismaClient,
): Promise<void> {
  const [tableCheck] = await prisma.$queryRaw<SeedTableCheckResult[]>`
    SELECT
      to_regclass('auth.users')::text AS "usersTable",
      to_regclass('auth.admins')::text AS "adminsTable"
  `;

  const missingTables = [
    ['auth.users', tableCheck?.usersTable],
    ['auth.admins', tableCheck?.adminsTable],
  ]
    .filter(([, resolvedTable]) => !resolvedTable)
    .map(([tableName]) => tableName);

  if (missingTables.length === 0) {
    return;
  }

  throw new Error(
    [
      `Cannot run seed because required table(s) are missing: ${missingTables.join(
        ', ',
      )}.`,
      'Run migrations before seeding.',
      'For local development, use: pnpm exec prisma migrate reset',
      'For a non-destructive migration attempt, use: pnpm exec prisma migrate deploy',
      'If Prisma says migrations are already applied but these tables are still missing, the database has drifted and must be reset or repaired manually.',
    ].join(' '),
  );
}
