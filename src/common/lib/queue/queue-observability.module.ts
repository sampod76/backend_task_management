import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { BullMqModule } from './bullmq.module';
import { QueueObservabilityController } from './queue-observability.controller';
import { QueueObservabilityService } from './queue-observability.service';
import { FILE_PROCESSING_QUEUE } from '../../../modules/files/queue/file-queue.constant';
import { AppConfig } from '../../../config/app.config';

@Module({
  imports: [
    BullMqModule,
    RedisModule,
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
  controllers: [QueueObservabilityController],
  providers: [QueueObservabilityService],
})
export class QueueObservabilityModule {}
