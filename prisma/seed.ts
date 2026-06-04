import 'dotenv/config';
import { createSeedPrismaClient } from './seed/helpers/prisma-client';
import { runSeeders } from './seed/seed-runner';

async function main() {
  const prisma = createSeedPrismaClient();

  try {
    await runSeeders(prisma);
    console.log('Database seeding completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Database seeding failed.');
  console.error(error);
  process.exit(1);
});
// package.json in scripts in add
// "seed": "ts-node prisma/seed.ts",
