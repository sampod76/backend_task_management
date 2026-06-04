import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { MaintenanceModule } from './maintenance.module';

let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  const logger = new Logger('Maintenance');

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
    logger.log('[maintenance] starting application context...');

    /**
     * =========================================================
     * Create Application Context
     * =========================================================
     */

    const app = await NestFactory.createApplicationContext(MaintenanceModule, {
      bufferLogs: true,
    });

    /**
     * =========================================================
     * Enable Graceful Shutdown
     * =========================================================
     */

    app.enableShutdownHooks();

    /**
     * =========================================================
     * Use Nest Logger
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
     * Runtime Logs
     * =========================================================
     */

    logger.log('Maintenance service started successfully');

    logger.log(`Environment: ${process.env.NODE_ENV}`);

    logger.log(`PID: ${process.pid}`);

    /**
     * =========================================================
     * Graceful Shutdown Handler
     * =========================================================
     */

    const shutdown = async (signal: string): Promise<void> => {
      if (isShuttingDown) {
        logger.warn(`Maintenance already shutting down; ignored ${signal}`);

        return;
      }

      isShuttingDown = true;

      logger.warn(`Received ${signal}; shutting down maintenance service...`);

      try {
        await app.close();

        logger.log('Maintenance service shutdown complete');

        setTimeout(() => process.exit(0), 100);
      } catch (error) {
        logger.error(
          'Failed to shutdown maintenance service',
          error instanceof Error ? error.stack : String(error),
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
    logger.error(
      '[maintenance] failed to start',
      error instanceof Error ? error.stack : String(error),
    );

    process.exit(1);
  }
}

void bootstrap();
