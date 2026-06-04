import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { FILE_PROCESSING_QUEUE, FILE_QUEUE_JOBS } from './file-queue.constant';

/**
 * Producer boundary for asynchronous file jobs.
 *
 * Flow:
 * FilesService
 * -> FileQueueProducer
 * -> FILE_PROCESSING_QUEUE
 * -> FileWorkerRunner/FileProcessorWorker
 *
 * Runtime note:
 * jobId is deterministic for process/delete operations, so repeated calls for
 * the same file/path are naturally deduplicated while the job exists.
 *
 * @see src/modules/files/files.service.ts
 * @see src/modules/files/queue/file-processor.worker.ts
 */
@Injectable()
export class FileQueueProducer {
  private readonly logger = new Logger(FileQueueProducer.name);

  constructor(
    @InjectQueue(FILE_PROCESSING_QUEUE)
    private readonly fileQueue: Queue,
  ) {}

  async addProcessUploadedFileJob(payload: {
    fileId: string;
    path: string;
    mimetype: string;
  }) {
    const jobId = `file:process:${payload.fileId}`;
    this.logger.log(
      JSON.stringify({
        message: 'Adding file processing job',
        queue: FILE_PROCESSING_QUEUE,
        jobName: FILE_QUEUE_JOBS.PROCESS_UPLOADED_FILE,
        jobId,
        fileId: payload.fileId,
      }),
    );

    const job = await this.fileQueue.add(
      FILE_QUEUE_JOBS.PROCESS_UPLOADED_FILE,
      payload,
      {
        jobId: `file:process:${payload.fileId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    this.logger.log(
      JSON.stringify({
        message: 'File processing job added',
        queue: FILE_PROCESSING_QUEUE,
        jobName: job.name,
        jobId: job.id,
        fileId: payload.fileId,
      }),
    );
  }

  async addDeleteS3FileJob(payload: { path: string }) {
    const jobId = `file:delete:${payload.path}`;
    this.logger.log(
      JSON.stringify({
        message: 'Adding file delete job',
        queue: FILE_PROCESSING_QUEUE,
        jobName: FILE_QUEUE_JOBS.DELETE_S3_FILE,
        jobId,
        path: payload.path,
      }),
    );

    const job = await this.fileQueue.add(
      FILE_QUEUE_JOBS.DELETE_S3_FILE,
      payload,
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    this.logger.log(
      JSON.stringify({
        message: 'File delete job added',
        queue: FILE_PROCESSING_QUEUE,
        jobName: job.name,
        jobId: job.id,
        path: payload.path,
      }),
    );
  }
}
