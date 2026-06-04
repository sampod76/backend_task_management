import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, QueueEvents, Worker } from 'bullmq';

import { buildBullConnection } from '../../../common/lib/redis/redis.bull';

import {
  AUTOMATION_QUEUE,
  AUTOMATION_TEST_JOB,
} from '../../../common/lib/queue/queue.constant';

import { AppConfig } from '../../../config/app.config';

import { AutomationEvent } from '../types/automation-event.type';

import { AutomationProcessor } from './automation.processor';

/**
 * Owns the standalone BullMQ worker process for automation jobs.
 *
 * Flow:
 * worker.ts
 * -> WorkerAppModule
 * -> AutomationWorkerRunner.onModuleInit()
 * -> BullMQ Worker(AUTOMATION_QUEUE)
 * -> AutomationProcessor.process()
 *
 * Dependencies:
 * - Redis connection built from buildBullConnection()
 * - QueueEvents for observability and enqueueAndWait support
 * - AutomationProcessor for validated business execution
 *
 * Warning:
 * This runner is intentionally not decorated with @Processor from Nest BullMQ.
 * It manually creates Worker/Queue/QueueEvents so the worker process can have
 * explicit lifecycle logging and Redis settings. Keep close ordering in
 * onModuleDestroy() when adding resources.
 *
 * @see src/worker.ts
 * @see src/worker-app.module.ts
 * @see src/common/lib/redis/redis.bull.ts
 */
@Injectable()
export class AutomationWorkerRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationWorkerRunner.name);

  private worker?: Worker<AutomationEvent | Record<string, unknown>>;

  private events?: QueueEvents;

  private queue?: Queue<AutomationEvent>;

  private isWorkerActiveLogged = false;

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly processor: AutomationProcessor,
  ) {}

  async onModuleInit() {
    const app = this.configService.getOrThrow('app', {
      infer: true,
    });

    const connection = buildBullConnection(app);

    this.logger.log(
      JSON.stringify(
        {
          message: 'Starting automation worker',
          queue: AUTOMATION_QUEUE,

          prefix: app.redis.queue.keyPrefix,

          redis: {
            host: app.redis.queue.host,
            port: app.redis.queue.port,
            tls: app.redis.queue.tls,
          },

          concurrency: app.queue.concurrency,
        },
        null,
        2,
      ),
    );

    // =====================================================
    // ✅ QUEUE
    // =====================================================

    this.queue = new Queue<AutomationEvent>(AUTOMATION_QUEUE, {
      connection,
      prefix: app.redis.queue.keyPrefix,
    });

    // =====================================================
    // ✅ WORKER
    // =====================================================

    this.worker = new Worker<AutomationEvent | Record<string, unknown>>(
      AUTOMATION_QUEUE,

      async (job: Job<AutomationEvent | Record<string, unknown>>) => {
        this.logger.log(
          JSON.stringify(
            {
              message: 'Automation worker received job',

              queue: AUTOMATION_QUEUE,

              jobName: job.name,

              jobId: job.id,

              attempt: job.attemptsMade + 1,
            },
            null,
            2,
          ),
        );

        // =====================================================
        // ✅ TEST JOB
        // =====================================================

        if (job.name === AUTOMATION_TEST_JOB) {
          this.logger.log(
            JSON.stringify(
              {
                message: 'Automation test job processed',

                queue: AUTOMATION_QUEUE,

                prefix: app.redis.queue.keyPrefix,

                jobId: job.id,

                data: job.data,
              },
              null,
              2,
            ),
          );

          return {
            success: true,
            test: true,
            processedAt: new Date().toISOString(),
          };
        }

        // =====================================================
        // ✅ NORMAL JOB
        // =====================================================

        return this.processor.process(job as Job<AutomationEvent>);
      },

      {
        connection,

        prefix: app.redis.queue.keyPrefix,

        concurrency: app.queue.concurrency,

        lockDuration: app.queue.lockDurationMs,

        stalledInterval: app.queue.stalledIntervalMs,

        maxStalledCount: app.queue.maxStalledCount,

        metrics: {
          maxDataPoints: app.queue.metricsMaxDataPoints,
        },
      },
    );

    // =====================================================
    // ✅ QUEUE EVENTS
    // =====================================================

    this.events = new QueueEvents(AUTOMATION_QUEUE, {
      connection,
      prefix: app.redis.queue.keyPrefix,
    });

    // =====================================================
    // ✅ EVENTS READY
    // =====================================================

    try {
      await Promise.all([
        this.worker.waitUntilReady(),
        this.events.waitUntilReady(),
      ]);

      this.logger.log(
        JSON.stringify(
          {
            message: 'Automation worker fully ready',

            queue: AUTOMATION_QUEUE,

            prefix: app.redis.queue.keyPrefix,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify(
          {
            message: 'Automation worker failed during startup',

            queue: AUTOMATION_QUEUE,

            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      );

      throw error;
    }

    // =====================================================
    // ✅ QUEUE EVENTS ERROR
    // =====================================================

    this.events.on('error', (error) => {
      this.logger.error(
        JSON.stringify(
          {
            message: 'Automation QueueEvents Redis/runtime error',

            queue: AUTOMATION_QUEUE,

            prefix: app.redis.queue.keyPrefix,

            reason: error.message,
          },
          null,
          2,
        ),

        error.stack,
      );
    });

    // =====================================================
    // ✅ WORKER READY
    // =====================================================

    this.worker.on('ready', () => {
      if (!this.isWorkerActiveLogged) {
        this.logger.log(
          JSON.stringify(
            {
              message: 'Automation worker Redis connection ready',

              queue: AUTOMATION_QUEUE,

              prefix: app.redis.queue.keyPrefix,
            },
            null,
            2,
          ),
        );

        this.isWorkerActiveLogged = true;
      }
    });

    // =====================================================
    // ✅ ACTIVE
    // =====================================================

    this.worker.on('active', (job) => {
      this.logger.log(
        JSON.stringify(
          {
            message: 'Automation worker started job',

            queue: AUTOMATION_QUEUE,

            prefix: app.redis.queue.keyPrefix,

            jobName: job.name,

            jobId: job.id,

            eventId: this.getEventId(job.data),
          },
          null,
          2,
        ),
      );
    });

    // =====================================================
    // ✅ COMPLETED
    // =====================================================

    this.worker.on('completed', (job) => {
      this.logger.log(
        JSON.stringify(
          {
            message: 'Automation worker completed job',

            queue: AUTOMATION_QUEUE,

            prefix: app.redis.queue.keyPrefix,

            jobName: job.name,

            jobId: job.id,

            eventId: this.getEventId(job.data),
          },
          null,
          2,
        ),
      );
    });

    // =====================================================
    // ✅ FAILED
    // =====================================================

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        JSON.stringify(
          {
            message: 'Worker failed job',

            queue: AUTOMATION_QUEUE,

            jobId: job?.id,

            eventId: job ? this.getEventId(job.data) : undefined,

            reason: error.message,
          },
          null,
          2,
        ),

        error.stack,
      );
    });

    // =====================================================
    // ✅ WORKER ERROR
    // =====================================================

    this.worker.on('error', (error) => {
      this.logger.error(
        JSON.stringify(
          {
            message: 'Automation worker Redis/runtime error',

            queue: AUTOMATION_QUEUE,

            reason: error.message,
          },
          null,
          2,
        ),

        error.stack,
      );
    });

    // =====================================================
    // ✅ WAITING
    // =====================================================

    this.events.on('waiting', ({ jobId }) => {
      this.logger.log(
        JSON.stringify(
          {
            message: 'Automation queue event: waiting',

            queue: AUTOMATION_QUEUE,

            prefix: app.redis.queue.keyPrefix,

            jobId,
          },
          null,
          2,
        ),
      );
    });

    // =====================================================
    // ✅ COMPLETED EVENT
    // =====================================================

    this.events.on('completed', ({ jobId, returnvalue }) => {
      this.logger.log(
        JSON.stringify(
          {
            message: 'Automation queue event: completed',

            queue: AUTOMATION_QUEUE,

            prefix: app.redis.queue.keyPrefix,

            jobId,

            returnvalue:
              typeof returnvalue === 'object'
                ? '[object omitted]'
                : returnvalue,
          },
          null,
          2,
        ),
      );
    });

    // =====================================================
    // ✅ FAILED EVENT
    // =====================================================

    this.events.on('failed', ({ jobId, failedReason }) => {
      void (async () => {
        try {
          const job = await this.queue?.getJob(jobId);

          this.logger.error(
            JSON.stringify(
              {
                message: 'Automation queue event: failed',

                queue: AUTOMATION_QUEUE,

                prefix: app.redis.queue.keyPrefix,

                jobId,

                failedReason,

                stacktrace: job?.stacktrace,
              },
              null,
              2,
            ),
          );
        } catch (error) {
          this.logger.error(
            JSON.stringify({
              message: 'Failed to inspect failed job',

              jobId,

              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      })();
    });
  }

  async onModuleDestroy() {
    this.events?.removeAllListeners();

    this.worker?.removeAllListeners();

    await Promise.all([
      this.events?.close(),
      this.worker?.close(),
      this.queue?.close(),
    ]);
  }

  private getEventId(data: AutomationEvent | Record<string, unknown>) {
    return 'eventId' in data && typeof data.eventId === 'string'
      ? data.eventId
      : undefined;
  }
}
