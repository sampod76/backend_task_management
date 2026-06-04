import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { AuditLogAutoMationService } from '../services/audit-log-auto.service';
import { AutomationDlqService } from '../services/automation-dlq.service';
import { JobLogService } from '../services/job-log.service';
import { RuleEngineService } from '../services/rule-engine.service';
import { AutomationEvent } from '../types/automation-event.type';
import { AuditLogSchema } from '../../audit-log/schema/audit-log.schema';
import { ZodError } from 'zod';
import { AutomationJobStatus } from '../constants/automation-constants';

/**
 * BullMQ job processor for automation events.
 *
 * Flow:
 * AutomationWorkerRunner
 * -> AutomationProcessor.process()
 * -> AuditLogSchema validation
 * -> JobLogService.markProcessing()
 * -> AuditLogAutoMationService.save()
 * -> RuleEngineService.process()
 * -> JobLogService.markCompleted()
 *
 * Failure behavior:
 * - Zod payload errors are unrecoverable: the job is discarded, logged as
 *   invalid payload, and not moved to DLQ.
 * - Runtime/system errors are marked failed or retrying, then thrown so BullMQ
 *   retry/backoff settings apply.
 *
 * Warning:
 * The event is persisted to audit logs before rules execute. If rule execution
 * later fails, the audit record still exists and the job log records failure.
 *
 * @see src/modules/automation/processors/automation-worker.runner.ts
 * @see src/modules/automation/services/rule-engine.service.ts
 * @see src/modules/audit-log/schema/audit-log.schema.ts
 */
@Injectable()
export class AutomationProcessor {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    private readonly auditLogService: AuditLogAutoMationService,
    private readonly ruleEngineService: RuleEngineService,
    private readonly jobLogService: JobLogService,
    private readonly dlqService: AutomationDlqService,
  ) {}

  async process(job: Job<AutomationEvent>) {
    const startedAt = Date.now();

    try {
      const rawEvent = job.data;

      /*
       * Validation stays inside try so invalid payloads can still be persisted
       * to automation job logs for diagnostics.
       */
      const event = await AuditLogSchema.parseAsync(rawEvent);

      this.logger.log(
        JSON.stringify(
          {
            message: 'Processing automation event',
            eventType: event.eventType,
            eventId: event.eventId,
            jobId: job.id,
            attempt: job.attemptsMade + 1,
          },
          null,
          2,
        ),
      );

      await this.jobLogService.markProcessing(event, job.attemptsMade);

      await this.auditLogService.save(event);

      await this.ruleEngineService.process(event);

      await this.jobLogService.markCompleted(event);

      const durationMs = Date.now() - startedAt;

      return {
        success: true,
        eventId: event.eventId,
        durationMs,
      };
    } catch (error) {
      const rawEvent = job.data;
      const formattedError = this.formatError(error);
      // =====================================================
      // VALIDATION ERROR
      // =====================================================

      if (error instanceof ZodError) {
        this.logger.warn(
          JSON.stringify(
            {
              message: 'Automation payload validation failed',
              jobId: job.id,
              eventId: 'eventId' in rawEvent ? rawEvent.eventId : undefined,

              validation: error.flatten(),
            },
            null,
            2,
          ),
        );

        /*
         * No retry and no DLQ for schema errors: the producer sent a payload
         * that can never become valid by retrying.
         */

        await this.bestEffortMarkInvalidPayload(
          rawEvent,
          error.flatten(),
          job.attemptsMade + 1,
          job.id,
        );

        job.discard();

        throw new UnrecoverableError(
          JSON.stringify({
            name: 'ValidationError',
            message: 'Automation payload validation failed',
            validation: error.flatten(),
          }),
        );
      }

      // =====================================================
      // NORMAL SYSTEM ERROR
      // =====================================================

      const attemptsMade = job.attemptsMade + 1;

      const maxAttempts = job.opts.attempts ?? 1;

      const isFinalAttempt = attemptsMade >= maxAttempts;

      await this.jobLogService.markFailed(
        rawEvent,
        formattedError,
        attemptsMade,
        isFinalAttempt
          ? AutomationJobStatus.FAILED
          : AutomationJobStatus.RETRYING,
      );

      this.logger.error(
        JSON.stringify(
          {
            message: 'Automation event failed',
            jobId: job.id,
            error: formattedError,
          },
          null,
          2,
        ),
      );

      // Only system failures go to DLQ after the final BullMQ attempt.
      if (isFinalAttempt) {
        await this.bestEffortMoveToDlq(job, formattedError);
      }

      throw error;
    }
  }

  private formatError(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      name: 'NonErrorThrown',
      message: String(error),
    };
  }

  private async bestEffortMarkInvalidPayload(
    rawEvent: unknown,
    error: unknown,
    attempts: number,
    jobId?: string,
  ) {
    try {
      await this.jobLogService.markInvalidPayload(
        rawEvent !== null && typeof rawEvent === 'object'
          ? (rawEvent as Record<string, unknown>)
          : { value: rawEvent },
        error,
        attempts,
        jobId,
      );
    } catch (logError) {
      this.logger.error(
        JSON.stringify({
          message: 'Failed to persist validation failure log',
          jobId,
          error: this.formatError(logError),
        }),
      );
    }
  }

  private async bestEffortMoveToDlq(job: Job<AutomationEvent>, error: unknown) {
    try {
      await this.dlqService.moveToDlq(job, error);
    } catch (dlqError) {
      this.logger.error(
        JSON.stringify({
          message: 'Failed to move final-attempt job to DLQ',
          jobId: job.id,
          eventId: job.data.eventId,
          originalError: error,
          dlqError: this.formatError(dlqError),
        }),
      );
    }
  }
}
