import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

import { FileQueueProducer } from './queue/file-queue.producer';
import { FILE_PROCESSING_QUEUE } from './queue/file-queue.constant';
import { AppConfig } from '../../config/app.config';
import { FilesCoreModule } from './files-core.module';

@Module({
  imports: [
    FilesCoreModule,
    BullModule.registerQueueAsync({
      name: FILE_PROCESSING_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => {
        const app = config.getOrThrow('app', { infer: true });

        return {
          prefix: app.redis.queue.keyPrefix,
        };
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, FileQueueProducer],
  exports: [FilesService, FilesCoreModule, FileQueueProducer],
})
export class FilesModule {}
