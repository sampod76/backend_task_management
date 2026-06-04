import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from './config/app.config';
import { WorkerAppModule } from './worker-app.module';

let isShuttingDown = false;

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');

  /**
   * =========================================================
   * Process Level Error Handling
   * =========================================================
   */

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', reason as any);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
  });

  try {
    const startedAt = new Date().toISOString();

    logger.log(
      JSON.stringify({
        message: 'Worker starting',
        pid: process.pid,
        startedAt,
        nodeEnv: process.env.NODE_ENV,
      }),
    );

    /**
     * =========================================================
     * Create Worker Application Context
     * =========================================================
     */

    const app = await NestFactory.createApplicationContext(WorkerAppModule, {
      bufferLogs: true,
    });

    /**
     * =========================================================
     * Enable Shutdown Hooks
     * =========================================================
     */

    app.enableShutdownHooks();

    /**
     * =========================================================
     * Logger
     * =========================================================
     */

    app.useLogger(new Logger());

    /**
     * =========================================================
     * Initialize Lifecycle Hooks
     * =========================================================
     */

    await app.init();

    /**
     * =========================================================
     * Config
     * =========================================================
     */

    const config = app.get(ConfigService<AppConfig>);

    const appConfig = config.getOrThrow('app', {
      infer: true,
    });

    /**
     * =========================================================
     * Startup Logs
     * =========================================================
     */

    logger.log(
      JSON.stringify({
        message: 'Worker process started',
        pid: process.pid,
        prefix: appConfig.redis.queue.keyPrefix,
        concurrency: appConfig.queue.concurrency,
      }),
    );

    /**
     * =========================================================
     * Graceful Shutdown
     * =========================================================
     */

    const shutdown = async (signal: string) => {
      if (isShuttingDown) {
        logger.warn(`Worker already shutting down; ignored ${signal}`);

        return;
      }

      isShuttingDown = true;

      logger.warn(
        JSON.stringify({
          message: 'Worker shutting down',
          signal,
          pid: process.pid,
        }),
      );

      try {
        await app.close();

        logger.log(
          JSON.stringify({
            message: 'Worker shutdown complete',
            signal,
            pid: process.pid,
          }),
        );

        setTimeout(() => process.exit(0), 100);
      } catch (error) {
        logger.error(
          JSON.stringify({
            message: 'Worker shutdown failed',
            signal,
            pid: process.pid,
            reason: error instanceof Error ? error.message : String(error),
          }),
          error instanceof Error ? error.stack : undefined,
        );

        setTimeout(() => process.exit(1), 100);
      }
    };

    /**
     * =========================================================
     * Shutdown Signals
     * =========================================================
     */

    process.once('SIGINT', () => void shutdown('SIGINT'));

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    console.error('[worker] failed to start', error);

    process.exit(1);
  }
}

void bootstrap();
