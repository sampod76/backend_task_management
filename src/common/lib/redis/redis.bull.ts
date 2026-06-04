import { ConnectionOptions } from 'bullmq';
import { AppConfig } from '../../../config/app.config';

/**
 * Builds the Redis connection options used by all BullMQ producers, workers,
 * queues, and QueueEvents instances.
 *
 * Runtime notes:
 * - maxRetriesPerRequest must stay null for BullMQ blocking commands.
 * - TLS servername follows the configured Redis host.
 * - retryStrategy caps reconnect delay to avoid unbounded worker stalls.
 *
 * @see src/common/lib/queue/bullmq.module.ts
 * @see src/modules/automation/processors/automation-worker.runner.ts
 * @see src/modules/files/queue/file-worker.runner.ts
 */
export const buildBullConnection = (
  appConfig: AppConfig['app'],
): ConnectionOptions => ({
  host: appConfig.redis.queue.host,
  port: appConfig.redis.queue.port,
  password: appConfig.redis.queue.password,
  connectionName: `${appConfig.env}:bullmq`,

  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  connectTimeout: appConfig.redis.connectTimeoutMs,
  commandTimeout: appConfig.redis.commandTimeoutMs,
  keepAlive: 30_000,

  retryStrategy(times: number) {
    return Math.min(Math.max(2 ** times * 500, 1000), 30_000);
  },

  ...(appConfig.redis.queue.tls
    ? {
        tls: {
          servername: appConfig.redis.queue.host,
        },
      }
    : {}),
});
