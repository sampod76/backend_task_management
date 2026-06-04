import { RedisOptions } from 'ioredis';

import { AppConfig } from '../../../config/app.config';

export const buildRedisConfig = (
  app: AppConfig['app'],
  connectionName: string,
): RedisOptions => ({
  host: app.redis.host,
  port: app.redis.port,
  password: app.redis.password || undefined,
  // connectionName: `${app.env}:${connectionName}`,
  connectionName: `automation-queue`,
  // keyPrefix: `${app.redis.queue.keyPrefix}`,

  lazyConnect: true,
  connectTimeout: app.redis.connectTimeoutMs,
  commandTimeout: app.redis.commandTimeoutMs,
  keepAlive: 30000,

  retryStrategy(times) {
    return Math.min(Math.max(2 ** times * 500, 1000), 30000);
  },

  ...(app.redis.tls
    ? {
        tls: {
          servername: app.redis.host,
        },
      }
    : {}),
});
