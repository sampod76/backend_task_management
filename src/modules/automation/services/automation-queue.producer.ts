import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { buildBullConnection } from '../../../common/lib/redis/redis.bull';
import {
  AUTOMATION_PROCESS_EVENT_JOB,
  AUTOMATION_QUEUE,
  AUTOMATION_TEST_JOB,
} from '../../../common/lib/queue/queue.constant';
import { AppConfig } from '../../../config/app.config';
import { AutomationEvent } from '../types/automation-event.type';

/**
 * Producer boundary for automation events.
 *
 * Flow:
 * Domain/service event
 * -> AutomationQueueProducer.enqueue()
 * -> BullMQ AUTOMATION_QUEUE
 * -> AutomationWorkerRunner
 * -> AutomationProcessor
 *
 * Runtime notes:
 * - jobId is derived from eventId, so duplicate publishes with the same eventId
 *   collapse at the queue layer while the job is retained.
 * - QueueEvents is used by enqueueAndWait() for synchronous debug/test flows.
 *
 * Warning:
 * Do not mutate the AutomationEvent after passing it to enqueue(); BullMQ
 * serializes job data and the worker will receive the serialized copy.
 *
 * @see src/modules/automation/processors/automation-worker.runner.ts
 * @see src/common/lib/queue/queue.constant.ts
 */
@Injectable()
export class AutomationQueueProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationQueueProducer.name);
  private queueEvents?: QueueEvents;

  constructor(
    @InjectQueue(AUTOMATION_QUEUE)
    private readonly queue: Queue<AutomationEvent | Record<string, unknown>>,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async onModuleInit() {
    const app = this.configService.getOrThrow('app', { infer: true });

    this.queueEvents = new QueueEvents(AUTOMATION_QUEUE, {
      connection: buildBullConnection(app),
      prefix: app.redis.queue.keyPrefix,
    });

    this.queueEvents.on('error', (error) => {
      this.logger.error(
        JSON.stringify({
          message: 'Automation QueueEvents connection error',
          queue: AUTOMATION_QUEUE,
          prefix: app.redis.queue.keyPrefix,
          reason: error.message,
        }),
        error.stack,
      );
    });

    await this.queueEvents.waitUntilReady();

    this.logger.log(
      JSON.stringify({
        message: 'Automation QueueEvents ready',
        queue: AUTOMATION_QUEUE,
        prefix: app.redis.queue.keyPrefix,
      }),
    );
  }

  async onModuleDestroy() {
    await this.queueEvents?.close();
  }

  async enqueue(event: AutomationEvent) {
    const app = this.configService.getOrThrow('app', { infer: true });

    this.logger.log(
      JSON.stringify(
        {
          message: 'Adding automation job',
          queue: AUTOMATION_QUEUE,
          prefix: app.redis.queue.keyPrefix,
          jobName: AUTOMATION_PROCESS_EVENT_JOB,
          eventId: event.eventId,
          jobId: `automation:event:${event.eventId}`,
        },
        null,
        2,
      ),
    );

    const job = await this.queue.add(AUTOMATION_PROCESS_EVENT_JOB, event, {
      jobId: `automation:event:${event.eventId}`,
    });

    this.logger.log(
      JSON.stringify(
        {
          message: 'Automation job added',
          queue: AUTOMATION_QUEUE,
          prefix: app.redis.queue.keyPrefix,
          jobName: job.name,
          jobId: job.id,
          eventId: event.eventId,
        },
        null,
        2,
      ),
    );

    return job;
  }

  async enqueueAndWait(event: AutomationEvent, timeoutMs = 120_000) {
    if (!this.queueEvents) {
      throw new Error('Automation QueueEvents is not initialized');
    }

    const job = await this.enqueue(event);

    try {
      const result = await job.waitUntilFinished(this.queueEvents, timeoutMs);

      return {
        job,
        result,
      };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          message: 'Automation job finished with failure or timed out',
          queue: AUTOMATION_QUEUE,
          jobName: job.name,
          jobId: job.id,
          eventId: event.eventId,
          state: await job.getState(),
          failedReason: job.failedReason,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      throw error;
    }
  }

  async testJobEnqueue() {
    const app = this.configService.getOrThrow('app', { infer: true });

    this.logger.log(
      JSON.stringify(
        {
          message: 'Adding automation test job====',
          queue: AUTOMATION_QUEUE,
          prefix: app.redis.queue.keyPrefix,
          jobName: AUTOMATION_TEST_JOB,
          // redis: {
          //   host: app.redis.queue.host,
          //   port: app.redis.queue.port,
          //   tls: app.redis.queue.tls,
          //   hasPassword: Boolean(app.redis.queue.password),
          // },
        },
        null,
        2,
      ),
    );

    const job = await this.queue.add(
      AUTOMATION_TEST_JOB,
      { hello: 'world', createdAt: new Date().toISOString() },
      {
        jobId: `automation:test:${Date.now()}`,
        attempts: 1,
      },
    );

    this.logger.log(
      JSON.stringify(
        {
          message: 'Automation test job added===68',
          queue: AUTOMATION_QUEUE,
          prefix: app.redis.queue.keyPrefix,
          jobName: job.name,
          jobId: job.id,
        },
        null,
        2,
      ),
    );

    return job;
  }
}
