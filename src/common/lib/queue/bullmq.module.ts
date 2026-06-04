import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { buildBullConnection } from '../redis/redis.bull';
import { AppConfig } from '../../../config/app.config';
import { AUTOMATION_DLQ_QUEUE, AUTOMATION_QUEUE } from './queue.constant';

/**
 * Global BullMQ queue registration.
 *
 * Queues:
 * - AUTOMATION_QUEUE: normal automation event processing
 * - AUTOMATION_DLQ_QUEUE: final-attempt automation failures
 *
 * Runtime notes:
 * - Uses buildBullConnection() so API and worker processes share Redis options.
 * - Default attempts/backoff/remove settings come from validated app config.
 *
 * Warning:
 * Changing prefix, attempts, backoff, or retention changes operational behavior
 * for both producers and workers. Keep worker runner settings aligned.
 *
 * @see src/common/lib/redis/redis.bull.ts
 * @see src/modules/automation/processors/automation-worker.runner.ts
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const app = configService.getOrThrow('app', { infer: true });

        return {
          connection: buildBullConnection(app),

          prefix: app.redis.queue.keyPrefix,

          limiter: {
            max: app.queue.limiterMax,
            duration: app.queue.limiterDurationMs,
          },

          defaultJobOptions: {
            attempts: app.queue.attempts,

            backoff: {
              type: 'exponential',
              delay: app.queue.backoffDelay,
            },

            removeOnComplete: {
              count: app.queue.removeOnComplete,
            },

            removeOnFail: {
              count: app.queue.removeOnFail,
            },
          },
          streams: {
            events: {
              maxLen: app.queue.metricsMaxDataPoints,
            },
          },
        };
      },
    }),
    BullModule.registerQueueAsync({
      name: AUTOMATION_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => {
        const app = config.getOrThrow('app', { infer: true });

        return {
          connection: buildBullConnection(app),
          prefix: app.redis.queue.keyPrefix,
          defaultJobOptions: {
            attempts: app.queue.attempts,

            backoff: {
              type: 'exponential',
              delay: app.queue.backoffDelay,
            },
            removeOnComplete: {
              count: app.queue.removeOnComplete,
            },
            removeOnFail: {
              count: app.queue.removeOnFail,
            },
          },
        };
      },
    }),
    BullModule.registerQueueAsync({
      name: AUTOMATION_DLQ_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => {
        const app = config.getOrThrow('app', { infer: true });

        return {
          connection: buildBullConnection(app),
          prefix: app.redis.queue.keyPrefix,
          defaultJobOptions: {
            attempts: 1,
            removeOnComplete: {
              count: app.queue.removeOnComplete,
            },
            removeOnFail: {
              count: app.queue.removeOnFail,
            },
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class BullMqModule {}
