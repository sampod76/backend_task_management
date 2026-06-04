import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig, appConfig } from './config/app.config';

import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './database/prisma.module';

import { LogCleanupModule } from './common/jobs/log-cleanup/log-cleanup.module';
import { PartitionModule } from './common/infrastructure/partition/partition.module';

@Module({
  imports: [
    ConfigModule.forRoot<AppConfig>({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig],
      cache: true,
      expandVariables: false,
    }),
    ScheduleModule.forRoot(),

    PrismaModule,

    PartitionModule,

    LogCleanupModule,
  ],
})
export class MaintenanceModule {}
