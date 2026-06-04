import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { AppConfig } from '../../../config/app.config';
import { buildBullConnection } from '../../../common/lib/redis/redis.bull';
import { FILE_PROCESSING_QUEUE } from './file-queue.constant';
import { FileProcessorWorker } from './file-processor.worker';

/**
 * Manual BullMQ worker runner for file jobs.
 *
 * Flow:
 * FileQueueProducer
 * -> FILE_PROCESSING_QUEUE
 * -> FileWorkerRunner
 * -> FileProcessorWorker
 *
 * Warning:
 * Like AutomationWorkerRunner, this owns raw Worker lifecycle and Redis
 * connection settings. Close any new queue resources in onModuleDestroy().
 *
 * @see src/modules/files/queue/file-processor.worker.ts
 * @see src/common/lib/redis/redis.bull.ts
 */
@Injectable()
export class FileWorkerRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileWorkerRunner.name);
  private worker?: Worker;
  private isWorkerActiveLogged = false;

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly processor: FileProcessorWorker,
  ) {}

  onModuleInit() {
    const app = this.configService.getOrThrow('app', { infer: true });

    this.logger.log(
      JSON.stringify({
        message: 'Starting file worker',
        queue: FILE_PROCESSING_QUEUE,
        prefix: app.redis.queue.keyPrefix,
        // redis: {
        //   host: app.redis.queue.host,
        //   port: app.redis.queue.port,
        //   tls: app.redis.queue.tls,
        //   hasPassword: Boolean(app.redis.queue.password),
        // },
        concurrency: app.queue.concurrency,
        lockDurationMs: app.queue.lockDurationMs,
      }),
    );

    this.worker = new Worker(
      FILE_PROCESSING_QUEUE,
      async (job: Job) => {
        this.logger.log(
          JSON.stringify({
            message: 'File worker received job',
            queue: FILE_PROCESSING_QUEUE,
            jobName: job.name,
            jobId: job.id,
            attempt: job.attemptsMade + 1,
          }),
        );

        return this.processor.process(job);
      },
      {
        connection: buildBullConnection(app),
        prefix: app.redis.queue.keyPrefix,
        concurrency: app.queue.concurrency,
        lockDuration: app.queue.lockDurationMs,
        stalledInterval: app.queue.stalledIntervalMs,
        maxStalledCount: app.queue.maxStalledCount,
      },
    );

    this.worker.on('ready', () => {
      if (!this.isWorkerActiveLogged) {
        this.logger.log(
          JSON.stringify({
            message: 'File worker is active',
            queue: FILE_PROCESSING_QUEUE,
            prefix: app.redis.queue.keyPrefix,
          }),
        );

        this.isWorkerActiveLogged = true;
      }
    });

    this.worker.on('active', (job) => {
      this.logger.log(
        JSON.stringify({
          message: 'File worker started job',
          queue: FILE_PROCESSING_QUEUE,
          jobName: job.name,
          jobId: job.id,
        }),
      );
    });

    this.worker.on('completed', (job) => {
      this.logger.log(
        JSON.stringify({
          message: 'File worker completed job',
          queue: FILE_PROCESSING_QUEUE,
          jobName: job.name,
          jobId: job.id,
        }),
      );
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        JSON.stringify({
          message: 'File worker failed job',
          queue: FILE_PROCESSING_QUEUE,
          jobName: job?.name,
          jobId: job?.id,
          reason: error.message,
        }),
        error.stack,
      );
    });

    this.worker.on('error', (error) => {
      this.logger.error(
        JSON.stringify({
          message: 'File worker Redis/runtime error',
          queue: FILE_PROCESSING_QUEUE,
          reason: error.message,
        }),
        error.stack,
      );
    });

    this.logger.log(
      JSON.stringify({
        message: 'File worker started',
        queue: FILE_PROCESSING_QUEUE,
        concurrency: app.queue.concurrency,
      }),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
