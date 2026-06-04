import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig, appConfig } from './config/app.config';
import { PrismaModule } from './database/prisma.module';
import { BullMqModule } from './common/lib/queue/bullmq.module';
import { AutomationWorkerModule } from './modules/automation/automation-worker.module';
import { FilesWorkerModule } from './modules/files/files-worker.module';

/**
 * Nest module used only by the worker process.
 *
 * Purpose:
 * Load configuration, Prisma, BullMQ, and worker modules without HTTP
 * controllers/interceptors. This keeps queue consumers independent from the API
 * process while sharing database and Redis configuration.
 *
 * @see src/worker.ts
 * @see src/common/lib/queue/bullmq.module.ts
 */
@Module({
  imports: [
    ConfigModule.forRoot<AppConfig>({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig],
      cache: true,
      expandVariables: false,
    }),
    PrismaModule,
    BullMqModule,
    AutomationWorkerModule,
    FilesWorkerModule,
  ],
})
export class WorkerAppModule {}
