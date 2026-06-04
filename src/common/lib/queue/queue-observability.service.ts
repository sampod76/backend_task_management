import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AUTOMATION_DLQ_QUEUE, AUTOMATION_QUEUE } from './queue.constant';
import { FILE_PROCESSING_QUEUE } from '../../../modules/files/queue/file-queue.constant';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../../../database/prisma.service';

type QueueName =
  | typeof AUTOMATION_QUEUE
  | typeof AUTOMATION_DLQ_QUEUE
  | typeof FILE_PROCESSING_QUEUE;

/**
 * Read-only operational view of queue, Redis, and database health.
 *
 * Flow:
 * QueueObservabilityController
 * -> QueueObservabilityService
 * -> Redis ping + SELECT 1 + BullMQ queue readiness/counts
 *
 * Warning:
 * Metrics are live BullMQ counts, not historical analytics. For long-term job
 * trends, use automation_job_logs or external monitoring.
 *
 * @see src/common/lib/queue/queue-observability.controller.ts
 * @see src/common/lib/queue/bullmq.module.ts
 */
@Injectable()
export class QueueObservabilityService {
  private readonly queues: Record<QueueName, Queue>;

  constructor(
    @InjectQueue(AUTOMATION_QUEUE)
    automationQueue: Queue,
    @InjectQueue(AUTOMATION_DLQ_QUEUE)
    automationDlqQueue: Queue,
    @InjectQueue(FILE_PROCESSING_QUEUE)
    fileQueue: Queue,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {
    this.queues = {
      [AUTOMATION_QUEUE]: automationQueue,
      [AUTOMATION_DLQ_QUEUE]: automationDlqQueue,
      [FILE_PROCESSING_QUEUE]: fileQueue,
    };
  }

  async health() {
    const [redis, database, queues] = await Promise.all([
      this.redisHealth(),
      this.databaseHealth(),
      this.queueReadiness(),
    ]);

    const healthy =
      redis.status === 'up' &&
      database.status === 'up' &&
      Object.values(queues).every((queue) => queue.status === 'up');

    return {
      status: healthy ? 'ok' : 'degraded',
      redis,
      database,
      queues,
      checkedAt: new Date().toISOString(),
    };
  }

  async metrics() {
    const entries = await Promise.all(
      Object.entries(this.queues).map(async ([name, queue]) => {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused',
        );

        return [
          name,
          {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
            paused: counts.paused ?? 0,
          },
        ] as const;
      }),
    );

    return Object.fromEntries(entries);
  }

  private async redisHealth() {
    try {
      await this.redisService.getCacheClient().ping();
      return { status: 'up' as const };
    } catch (error) {
      return {
        status: 'down' as const,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async databaseHealth() {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return { status: 'up' as const };
    } catch (error) {
      return {
        status: 'down' as const,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async queueReadiness() {
    const entries = await Promise.all(
      Object.entries(this.queues).map(async ([name, queue]) => {
        try {
          await queue.isPaused();
          return [name, { status: 'up' as const }] as const;
        } catch (error) {
          return [
            name,
            {
              status: 'down' as const,
              reason: error instanceof Error ? error.message : String(error),
            },
          ] as const;
        }
      }),
    );

    return Object.fromEntries(entries) as Record<
      string,
      { status: 'up' | 'down'; reason?: string }
    >;
  }
}
