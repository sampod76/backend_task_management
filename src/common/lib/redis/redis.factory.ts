import Redis from 'ioredis';
import { AppConfig } from '../../../config/app.config';
import { buildRedisConfig } from './redis.config';
import { RedisLogger } from './redis.logger';

const redisLogger = new RedisLogger();

export const createRedisConnections = (app: AppConfig['app']) => {
  const cache = new Redis({
    ...buildRedisConfig(app, 'cache'),
  });

  const pub = new Redis({
    ...buildRedisConfig(app, 'pub'),
    maxRetriesPerRequest: null,
    commandTimeout: 0,
    enableReadyCheck: false,
  });

  const sub = new Redis({
    ...buildRedisConfig(app, 'sub'),
    maxRetriesPerRequest: null,
    commandTimeout: 0,
    enableReadyCheck: false,
  });

  // ✅ attach logger
  redisLogger.attach(cache, 'cache');
  redisLogger.attach(pub, 'pub');
  redisLogger.attach(sub, 'sub');

  return {
    cache,
    pub,
    sub,
  };
};
