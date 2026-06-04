import { Injectable } from '@nestjs/common';

import { AuditLogRepository } from './audit-log.repository';
import { Prisma } from '../../generated/prisma/client';
import { AuditLogQueryFilter } from './schema/audit-log.filter.schema';
import { AuthPayload } from '../auth/auth.types';
import { AppException } from '../../common/errors';
import {
  buildOffsetMeta,
  buildOffsetPagination,
} from '../../common/pagination/offset-pagination';
import { AUDIT_LOG_SORTABLE_FIELDS } from './constants/audit-log.constants';
import { AuditLogQueryBuilder } from './builders/audit-log.builder';
import { GenericApiData } from '../../common/http/http-response';
import { ServiceName } from '../../common/constants/automation';

@Injectable()
export class AuditLogService {
  constructor(private readonly repo: AuditLogRepository) {}

  // ✅ CREATE == this is create -> \src\modules\automation\services\audit-log-auto.service.ts
  // async create(createAuditLog: AuditLog) {
  //   const data: Prisma.AuditLogCreateInput = {
  //     entity: createAuditLog.entity,
  //     eventId: createAuditLog.eventId,
  //     eventType: createAuditLog.eventType,
  //     serviceName: createAuditLog.serviceName,
  //     entityId: createAuditLog.entityId,
  //     action: createAuditLog.action,
  //     actorId: createAuditLog.actorId,
  //     actorType: createAuditLog.actorType,
  //     actorEmail: createAuditLog.actorEmail,
  //     oldData: createAuditLog.oldData,
  //     newData: createAuditLog.newData,
  //     changedFields: createAuditLog.changedFields,
  //     metadata: createAuditLog.metadata,
  //     requestId: createAuditLog.requestId,
  //     ipAddress: createAuditLog.ipAddress,
  //     userAgent: createAuditLog.userAgent,
  //     result: createAuditLog.result,
  //     errorMessage: createAuditLog.errorMessage,
  //   };
  //   console.log('🚀 ~ AuditLogService ~ create ~ data:', data);

  //   return this.repo.create({
  //     data,
  //     select: { id: true }, // 🔥 optional
  //   });
  // }

  // ✅ FIND ALL
  async findAll(
    query: AuditLogQueryFilter,
    user: AuthPayload,
  ): Promise<GenericApiData<any[]>> {
    const pagination = buildOffsetPagination(query, AUDIT_LOG_SORTABLE_FIELDS);

    const where = new AuditLogQueryBuilder()
      .addSearch(query.search)
      .addFilters(query)
      .addDateRange(query.fromDate, query.toDate)
      .build();
    const select: Prisma.AuditLogSelect = {
      id: true,
      serviceName: true,
      action: true,
      eventId: true,
      eventType: true,
      entity: true,
      result: true,
      actorType: true,
      actorEmail: true,
      ipAddress: true,
      createdAt: true,
    };
    const [items, count] = await Promise.all([
      this.repo.findMany({ where, select }, pagination),
      this.repo.count({ where }),
    ]);

    return {
      meta: buildOffsetMeta(count, pagination.page, pagination.limit),
      items: items as any[],
    };
  }

  // ✅ FIND ONE
  async findOne(id: string, serviceName: ServiceName, user: AuthPayload) {
    const result = await this.repo.findById(id, serviceName);

    if (!result) {
      throw AppException.notFound('Audit log not found');
    }

    return result;
  }
}
