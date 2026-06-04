import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisLogger {
  private readonly logger = new Logger('Redis');

  attach(client: Redis, name: string) {
    client.on('connect', () => {
      this.logger.log(`[${name}] connecting...`);
    });

    client.on('ready', () => {
      this.logger.log(`[${name}] ready`);
    });

    client.on('error', (err) => {
      this.logger.error(`[${name}] error → ${err.message}`);
    });

    client.on('close', () => {
      this.logger.warn(`[${name}] connection closed`);
    });

    client.on('reconnecting', () => {
      this.logger.warn(`[${name}] reconnecting...`);
    });

    client.on('end', () => {
      this.logger.warn(`[${name}] disconnected`);
    });

    // ⚠️ optional but powerful
    client.on('commandTimeout', (cmd) => {
      this.logger.warn(`[${name}] timeout → ${cmd?.name}`);
    });
  }
}
