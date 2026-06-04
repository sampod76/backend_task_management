import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  AUTOMATION_DLQ_JOB,
  AUTOMATION_DLQ_QUEUE,
} from '../../../common/lib/queue/queue.constant';
import { AutomationEvent } from '../types/automation-event.type';

@Injectable()
export class AutomationDlqService {
  private readonly logger = new Logger(AutomationDlqService.name);

  constructor(
    @InjectQueue(AUTOMATION_DLQ_QUEUE)
    private readonly dlq: Queue,
  ) {}

  async moveToDlq(job: Job<AutomationEvent>, error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    const event = job.data;

    await this.dlq.add(
      AUTOMATION_DLQ_JOB,
      {
        originalQueue: job.queueName,
        originalJobId: job.id,
        originalJobName: job.name,
        event,
        reason,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
      },
      {
        jobId: `dlq:${job.queueName}:${job.id ?? event.eventId}`,
        attempts: 1,
        removeOnComplete: { count: 10000 },
        removeOnFail: { count: 10000 },
      },
    );

    this.logger.error(
      JSON.stringify({
        message: 'Moved job to DLQ',
        eventId: event.eventId,
        jobId: job.id,
        queue: job.queueName,
        reason,
      }),
    );
  }
}
