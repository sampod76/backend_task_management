import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FILE_QUEUE_JOBS } from './file-queue.constant';
import { AwsStorageService } from '../storage/aws-storage.service';

/**
 * Executes file queue jobs.
 *
 * Current jobs:
 * - PROCESS_UPLOADED_FILE: placeholder for post-upload processing
 * - DELETE_S3_FILE: removes an object from S3
 *
 * TODO:
 * Implement actual uploaded-file processing or remove the placeholder job if
 * processing is not required.
 *
 * @see src/modules/files/queue/file-queue.producer.ts
 */
@Injectable()
export class FileProcessorWorker {
  private readonly logger = new Logger(FileProcessorWorker.name);

  constructor(private readonly awsStorageService: AwsStorageService) {}

  async process(job: Job): Promise<void> {
    const startedAt = Date.now();

    try {
      switch (job.name) {
        case FILE_QUEUE_JOBS.PROCESS_UPLOADED_FILE:
          await this.processUploadedFile(job);
          break;

        case FILE_QUEUE_JOBS.DELETE_S3_FILE:
          await this.deleteS3File(job);
          break;

        default:
          this.logger.warn(
            JSON.stringify({
              message: 'Unknown file queue job',
              jobName: job.name,
              jobId: job.id,
            }),
          );
      }

      this.logger.log(
        JSON.stringify({
          message: 'File job completed',
          jobName: job.name,
          jobId: job.id,
          durationMs: Date.now() - startedAt,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          message: 'File job failed',
          jobName: job.name,
          jobId: job.id,
          durationMs: Date.now() - startedAt,
        }),
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async processUploadedFile(job: Job) {
    const { fileId, path, mimetype, category } = job.data;

    this.logger.log(
      JSON.stringify({
        message: 'Processing uploaded file',
        fileId,
        path,
        mimetype,
        category,
        jobId: job.id,
      }),
    );

    await Promise.resolve();
  }

  private async deleteS3File(job: Job) {
    const { fileId, path } = job.data as { fileId: string; path: string };

    await this.awsStorageService.deleteFile(path);

    this.logger.log(
      JSON.stringify({
        message: 'Deleted S3 file',
        fileId,
        path,
        jobId: job.id,
      }),
    );
  }
}
