import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app.config';
import { createRedisConnections } from './redis.factory';
import Redis from 'ioredis';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const isJsonValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === 'object') {
    return Object.values(value).every(isJsonValue);
  }

  return false;
};

/**
 * Shared Redis wrapper for cache and pub/sub clients.
 *
 * Runtime notes:
 * - Values are serialized as JSON; only JsonValue-safe data should be stored.
 * - Queue Redis connections are not taken from this service. BullMQ uses
 *   buildBullConnection() because it needs different ioredis options.
 *
 * Warning:
 * subscribe() attaches a message listener per call. Repeated subscriptions to
 * many channels can accumulate listeners unless callers manage lifecycle.
 *
 * @see src/common/lib/redis/redis.factory.ts
 * @see src/common/lib/redis/redis.bull.ts
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly cache: Redis;
  private readonly pub: Redis;
  private readonly sub: Redis;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const app = this.configService.getOrThrow('app', { infer: true });
    const { cache, pub, sub } = createRedisConnections(app);
    this.cache = cache;
    this.pub = pub;
    this.sub = sub;
  }

  /* ---------------- CACHE ---------------- */
  async set(key: string, value: JsonValue, ttl?: number) {
    const val = JSON.stringify(value);

    if (ttl) {
      await this.cache.set(key, val, 'EX', ttl);
    } else {
      await this.cache.set(key, val);
    }
  }

  async get<T extends JsonValue = JsonValue>(key: string): Promise<T | null> {
    const data = await this.cache.get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async del(key: string) {
    await this.cache.del(key);
  }

  /* ---------------- PUB/SUB ---------------- */
  async publish(channel: string, message: JsonValue) {
    await this.pub.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, handler: (msg: JsonValue) => void) {
    await this.sub.subscribe(channel);

    this.sub.on('message', (ch, msg) => {
      if (ch === channel) {
        const parsed: unknown = JSON.parse(msg);

        if (isJsonValue(parsed)) {
          handler(parsed);
        }
      }
    });
  }

  /* ---------------- RAW ACCESS ---------------- */
  getCacheClient() {
    return this.cache;
  }

  getPubClient() {
    return this.pub;
  }

  getSubClient() {
    return this.sub;
  }

  async onModuleDestroy() {
    await Promise.all([this.cache.quit(), this.pub.quit(), this.sub.quit()]);
  }
}
