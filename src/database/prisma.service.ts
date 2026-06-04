import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PrismaClientSingleton,
  ExtendedPrismaClient,
} from './prisma-client.singleton';
import { AppConfig } from 'src/config/app.config';

/**
 * Nest wrapper around the shared extended Prisma client.
 *
 * Flow:
 * PrismaModule
 * -> PrismaService
 * -> PrismaClientSingleton.getInstance()
 * -> repositories/services
 *
 * Runtime notes:
 * - Uses a singleton so multiple Nest providers do not create extra pools.
 * - Applies the softDeleteExtension in prisma-client.singleton.ts.
 *
 * Warning:
 * If the generated Prisma client is stale after schema changes, runtime fields
 * can differ from source .prisma files. Run prisma generate after migrations.
 *
 * @see src/database/prisma-client.singleton.ts
 * @see prisma/schema.prisma
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: ExtendedPrismaClient;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const envApp = this.configService.getOrThrow('app', { infer: true });

    this.prisma = PrismaClientSingleton.getInstance(
      envApp.database.postgresUrl,
    );
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  get client(): ExtendedPrismaClient {
    return this.prisma;
  }
}
