import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { getQueueToken } from '@nestjs/bullmq';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { Queue } from 'bullmq';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

import { AppConfig } from './config/app.config';

import { requestIdMiddleware } from './common/middlewares/request-id.middleware';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

import { ResponseInterceptor } from './common/interceptors/response.interceptor';

import { getCorsConfig, logCorsConfig } from './common/config/cors.config';

import {
  AUTOMATION_DLQ_QUEUE,
  AUTOMATION_QUEUE,
} from './common/lib/queue/queue.constant';

import { FILE_PROCESSING_QUEUE } from './modules/files/queue/file-queue.constant';

/**
 * =========================================================
 * HTTP Application Bootstrap
 * =========================================================
 *
 * Responsibilities:
 * - Create Nest application
 * - Configure global middlewares
 * - Configure global interceptors/filters
 * - Enable CORS
 * - Setup Bull Board dashboard
 * - Handle graceful shutdown
 * - Handle process-level errors
 * - Start HTTP server
 *
 * Runtime Flow:
 *
 * AppModule
 *   -> Middleware
 *   -> Global Filters
 *   -> Global Interceptors
 *   -> API Routes
 *   -> Bull Board
 *   -> HTTP Server
 *
 * =========================================================
 */

async function bootstrap() {
  const logger = new Logger('Bootstrap');

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

  /**
   * =========================================================
   * Graceful Shutdown Signals
   * =========================================================
   */

  process.on('SIGTERM', () => {
    logger.warn('SIGTERM received');
  });

  process.on('SIGINT', () => {
    logger.warn('SIGINT received');
  });

  try {
    /**
     * =========================================================
     * Create Nest Application
     * =========================================================
     */

    const app = await NestFactory.create(AppModule, {
      bodyParser: true,
      bufferLogs: true,
    });

    /**
     * =========================================================
     * Enable Graceful Shutdown Hooks
     * =========================================================
     */

    app.enableShutdownHooks();

    /**
     * =========================================================
     * Global Middlewares
     * =========================================================
     */

    app.use(cookieParser());

    /**
     * Request ID middleware MUST come before:
     * - ResponseInterceptor
     * - Logging systems
     * - Exception filters
     */
    app.use(requestIdMiddleware);

    /**
     * =========================================================
     * Config Service
     * =========================================================
     */

    const configService = app.get(ConfigService<AppConfig>);

    const appConfig = configService.getOrThrow('app', {
      infer: true,
    });

    /**
     * =========================================================
     * CORS Configuration
     * =========================================================
     */

    app.enableCors(getCorsConfig(appConfig));

    logCorsConfig(appConfig);

    /**
     * =========================================================
     * API Prefix
     * =========================================================
     */

    app.setGlobalPrefix('api/v1');

    /**
     * =========================================================
     * API Versioning (Optional)
     * =========================================================
     */

    app.enableVersioning({
      type: VersioningType.URI,
    });

    /**
     * =========================================================
     * Global Validation
     * =========================================================
     */

    // app.useGlobalPipes(
    //   new ValidationPipe({
    //     whitelist: true,
    //     forbidNonWhitelisted: true,
    //     transform: true,
    //     skipUndefinedProperties: true,
    //   }),
    // );

    /**
     * =========================================================
     * Global Exception Filter
     * =========================================================
     */

    app.useGlobalFilters(new GlobalExceptionFilter());

    /**
     * =========================================================
     * Global Interceptors
     * =========================================================
     */

    app.useGlobalInterceptors(new ResponseInterceptor());

    /**
     * =========================================================
     * Application Config
     * =========================================================
     */

    const port = configService.getOrThrow('app.port', {
      infer: true,
    });

    const enableQueueDashboard = configService.getOrThrow(
      'app.enableQueueDashboard',
      {
        infer: true,
      },
    );

    /**
     * =========================================================
     * Bull Board Dashboard
     * =========================================================
     */

    if (enableQueueDashboard) {
      logger.log('Initializing Bull Board dashboard...');

      const serverAdapter = new ExpressAdapter();

      serverAdapter.setBasePath('/api/v1/admin/queues');

      /**
       * Queue Instances
       */

      const automationQueue = app.get<Queue>(getQueueToken(AUTOMATION_QUEUE), {
        strict: false,
      });

      const automationDlqQueue = app.get<Queue>(
        getQueueToken(AUTOMATION_DLQ_QUEUE),
        {
          strict: false,
        },
      );

      const fileQueue = app.get<Queue>(getQueueToken(FILE_PROCESSING_QUEUE), {
        strict: false,
      });

      /**
       * Queue Adapters
       */

      const queues: BullMQAdapter[] = [];

      if (automationQueue) {
        queues.push(new BullMQAdapter(automationQueue));

        logger.log(`Bull Board queue registered: ${AUTOMATION_QUEUE}`);
      }

      if (automationDlqQueue) {
        queues.push(new BullMQAdapter(automationDlqQueue));

        logger.log(`Bull Board queue registered: ${AUTOMATION_DLQ_QUEUE}`);
      }

      if (fileQueue) {
        queues.push(new BullMQAdapter(fileQueue));

        logger.log(`Bull Board queue registered: ${FILE_PROCESSING_QUEUE}`);
      }

      /**
       * Create Bull Board
       */

      createBullBoard({
        queues,
        serverAdapter,
      });

      /**
       * Mount Bull Board Route
       */

      app.use('/api/v1/admin/queues', serverAdapter.getRouter());

      logger.log('Bull Board dashboard initialized successfully');
    }

    /**
     * =========================================================
     * Start HTTP Server
     * =========================================================
     */

    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Server running at http://localhost:${port}/api/v1`);

    logger.log(`🌍 Environment: ${appConfig.env}`);

    logger.log(
      `📦 Queue Dashboard: ${enableQueueDashboard ? 'Enabled' : 'Disabled'}`,
    );
  } catch (error) {
    /**
     * =========================================================
     * Bootstrap Failure
     * =========================================================
     */

    logger.error('Failed to bootstrap application', error);

    process.exit(1);
  }
}

void bootstrap();

// process.on('SIGINT', shutdown('SIGINT'));
// process.on('SIGTERM', shutdown('SIGTERM'));
