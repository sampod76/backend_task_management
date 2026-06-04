import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/generated/prisma/client';
import { softDeleteExtension } from './extensions/soft-delete.extension';

export type ExtendedPrismaClient = PrismaClient &
  ReturnType<PrismaClient['$extends']>;

/**
 * Process-local Prisma client singleton.
 *
 * Purpose:
 * Avoid creating a new PrismaPg adapter/client per injected PrismaService while
 * still exposing the extended client type to repositories.
 *
 * Update checklist:
 * - Add Prisma query logging here when tracing runtime schema/data issues.
 * - Regenerate src/generated/prisma after any .prisma model or enum change.
 * - Keep extensions explicit so repository behavior is easy to audit.
 *
 * @see src/database/extensions/soft-delete.extension.ts
 */
export class PrismaClientSingleton {
  private static instance: ExtendedPrismaClient | null = null;

  static getInstance(connectionString: string): ExtendedPrismaClient {
    if (!this.instance) {
      const adapter = new PrismaPg({ connectionString });

      const prisma = new PrismaClient({
        adapter,
        log: [{ emit: 'event', level: 'error' }],
      });

      this.instance = prisma.$extends(
        softDeleteExtension,
      ) as ExtendedPrismaClient;
    }

    return this.instance;
  }
}
