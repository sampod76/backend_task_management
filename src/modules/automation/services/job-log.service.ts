import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '../../../generated/prisma/client';
import { AutomationEvent } from '../types/automation-event.type';
import { JobLogRepository } from '../repositories/job-log.repository';
import { ServiceName } from '../../../common/constants/automation';
import {
  AutomationActionType,
  AutomationJobStatus,
} from '../constants/automation-constants';

/**
 * Persists automation job lifecycle state.
 *
 * Flow:
 * AutomationProcessor
 * -> markProcessing()
 * -> markCompleted() or markFailed()/markInvalidPayload()
 * -> automation_job_logs
 *
 * Runtime notes:
 * - Upserts are keyed by composite id_serviceName, matching the Prisma model.
 * - Invalid payloads may not have serviceName/eventId; fallback identifiers are
 *   generated so validation failures remain inspectable.
 *
 * Warning:
 * markInvalidPayload casts raw serviceName to ServiceName for persistence. If
 * invalid payload serviceName is absent or invalid, the DB write can still fail.
 *
 * @see src/modules/automation/processors/automation.processor.ts
 * @see src/modules/automation/repositories/job-log.repository.ts
 */
@Injectable()
export class JobLogService {
  constructor(private readonly repo: JobLogRepository) {}

  async markProcessing(event: AutomationEvent, attempts: number) {
    return this.repo.upsert({
      where: {
        id_serviceName: { id: event.eventId, serviceName: event.serviceName },
      },
      update: {
        status: AutomationJobStatus.PROCESSING,
        attempts,
        startedAt: new Date(),
      },
      create: {
        id: event.eventId,
        serviceName: event.serviceName,
        eventId: event.eventId,
        eventType: event.eventType,
        actionType: AutomationActionType.AUDIT_LOG,
        status: AutomationJobStatus.PROCESSING,
        attempts,
        startedAt: new Date(),
        payload: event as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async markCompleted(event: AutomationEvent) {
    return this.repo.update({
      where: {
        id_serviceName: { id: event.eventId, serviceName: event.serviceName },
      },
      data: {
        status: AutomationJobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }
  async markFailed(
    event: AutomationEvent,
    error: unknown,
    attempts: number,
    status: AutomationJobStatus,
  ) {
    const message = this.errorMessage(error);

    return this.repo.upsert({
      where: {
        id_serviceName: { id: event.eventId, serviceName: event.serviceName },
      },
      update: {
        status,
        attempts,
        error: message,
        failedAt:
          status === AutomationJobStatus.FAILED ? new Date() : undefined,
      },
      create: {
        id: event.eventId,
        serviceName: event.serviceName,
        eventId: event.eventId,
        eventType: event.eventType,
        actionType: AutomationActionType.AUDIT_LOG,
        status,
        attempts,
        error: message,
        failedAt:
          status === AutomationJobStatus.FAILED ? new Date() : undefined,
        payload: event as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async markInvalidPayload(
    rawEvent: Record<string, unknown>,
    error: unknown,
    attempts: number,
    jobId?: string,
  ) {
    const eventId =
      typeof rawEvent.eventId === 'string' && rawEvent.eventId.length > 0
        ? rawEvent.eventId
        : `invalid:${jobId ?? randomUUID()}`;

    const eventType =
      typeof rawEvent.eventType === 'string' && rawEvent.eventType.length > 0
        ? rawEvent.eventType
        : 'INVALID_PAYLOAD';

    const message = this.errorMessage(error);

    return this.repo.upsert({
      where: {
        id_serviceName: {
          id: eventId,
          serviceName: rawEvent.serviceName as ServiceName,
        },
      },
      update: {
        status: AutomationJobStatus.FAILED,
        attempts,
        error: message,
        failedAt: new Date(),
      },
      create: {
        id: eventId,
        serviceName: rawEvent.serviceName as ServiceName,
        eventId,
        eventType,
        actionType: AutomationActionType.AUDIT_LOG,
        status: AutomationJobStatus.FAILED,
        attempts,
        error: message,
        failedAt: new Date(),
        payload: rawEvent as Prisma.InputJsonValue,
      },
    });
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error !== null && typeof error === 'object') {
      return (
        (error as Record<string, unknown>).message?.toString() ??
        JSON.stringify(error)
      );
    }

    return 'Unknown error';
  }
}
