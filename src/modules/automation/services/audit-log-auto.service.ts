import { Injectable } from '@nestjs/common';

import { AutomationEvent } from '../types/automation-event.type';

import { Prisma } from '../../../generated/prisma/client';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';

@Injectable()
export class AuditLogAutoMationService {
  constructor(private readonly repo: AuditLogRepository) {}

  async save(event: AutomationEvent) {
    const existing = await this.repo.findMany({
      where: {
        eventId: event.eventId,
      },
      take: 1,
    });

    if (existing.length > 0) {
      return existing[0];
    }

    try {
      const data: Prisma.AuditLogCreateInput = {
        entity: event.entity,
        eventId: event.eventId,
        eventType: event.eventType,
        serviceName: event.serviceName,
        entityId: event.entityId,
        action: event.action,
        actorId: event.actorId,
        actorType: event.actorType,
        actorEmail: event.actorEmail,
        oldData: event.oldData,
        newData: event.newData,
        changedFields: event.changedFields,
        metadata: event.metadata,
        requestId: event.requestId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        result: event.result,
        errorMessage: event.errorMessage,
      };

      return await this.repo.create({
        data,
        select: { id: true }, // 🔥 optional
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const duplicate = await this.repo.findMany({
          where: { eventId: event.eventId },
          take: 1,
        });

        return duplicate[0];
      }

      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
