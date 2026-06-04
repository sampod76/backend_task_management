import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AppConfig } from '../../../config/app.config';
import { PrismaService } from '../../../database/prisma.service';
import { AutomationActionType } from '../constants/automation-constants';

type IdempotencyStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IdempotencyAcquireInput {
  key: string;
  eventId: string;
  ruleId?: string;
  actionType: AutomationActionType;
  target?: string;
}

/**
 * Database-backed idempotency guard for rule actions.
 *
 * Flow:
 * RuleEngineService.executeRule()
 * -> build stable idempotency key
 * -> acquire()
 * -> action side effect
 * -> complete() or fail()
 *
 * Concurrency behavior:
 * acquire() uses a single INSERT ... ON CONFLICT statement. It allows a retry
 * only when the previous status is FAILED or when a PROCESSING lock is stale
 * based on queue.idempotencyLockTtlMs.
 *
 * Warning:
 * The raw SQL casts enum values into the automation schema. If Prisma enum
 * names or Postgres enum schemas change, update this SQL and regenerate Prisma
 * together.
 *
 * @see prisma/automation-idempotency.prisma
 * @see src/modules/automation/services/rule-engine.service.ts
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async acquire(input: IdempotencyAcquireInput): Promise<boolean> {
    const app = this.configService.getOrThrow('app', { infer: true });
    const staleBefore = new Date(Date.now() - app.queue.idempotencyLockTtlMs);
    const id = randomUUID();

    const rows = await this.prisma.client.$queryRaw<
      Array<{ status: IdempotencyStatus }>
    >`
      INSERT INTO automation.automation_idempotency_keys (
        id, key, event_id, rule_id, action_type, target, status, locked_at, attempts, created_at, updated_at
      )
      VALUES (
        ${id},
        ${input.key},
        ${input.eventId},
        ${input.ruleId ?? null},
        ${input.actionType}::automation."AutomationActionType",
        ${input.target ?? null},
        'PROCESSING'::automation."AutomationIdempotencyStatus",
        now(),
        1,
        now(),
        now()
      )
      ON CONFLICT (key) DO UPDATE
      SET
        status = 'PROCESSING'::automation."AutomationIdempotencyStatus",
        locked_at = now(),
        attempts = automation.automation_idempotency_keys.attempts + 1,
        updated_at = now()
      WHERE
        automation.automation_idempotency_keys.status = 'FAILED'::automation."AutomationIdempotencyStatus"
        OR (
          automation.automation_idempotency_keys.status = 'PROCESSING'::automation."AutomationIdempotencyStatus"
          AND automation.automation_idempotency_keys.locked_at < ${staleBefore}
        )
      RETURNING status;
    `;

    if (rows.length > 0) {
      return true;
    }

    this.logger.log(
      JSON.stringify({
        message: 'Idempotent action skipped',
        idempotencyKey: input.key,
        eventId: input.eventId,
        ruleId: input.ruleId,
        actionType: input.actionType,
        target: input.target,
      }),
    );

    return false;
  }

  async complete(key: string) {
    await this.prisma.client.$executeRaw`
      UPDATE automation.automation_idempotency_keys
      SET
        status = 'COMPLETED'::automation."AutomationIdempotencyStatus",
        completed_at = now(),
        updated_at = now()
      WHERE key = ${key};
    `;
  }

  async fail(key: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    await this.prisma.client.$executeRaw`
      UPDATE automation.automation_idempotency_keys
      SET
        status = 'FAILED'::automation."AutomationIdempotencyStatus",
        failed_at = now(),
        failure_reason = ${message},
        updated_at = now()
      WHERE key = ${key};
    `;
  }
}
