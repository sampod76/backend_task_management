import { Prisma } from '../../../generated/prisma/client';
import { AUDIT_LOG_SEARCHABLE_FIELDS } from '../constants/audit-log.constants';
import { AuditLogQueryFilter } from '../schema/audit-log.filter.schema';
/**
 * AuditLogQueryBuilder
 *
 * Converts API query filters into Prisma-compatible `where` conditions.
 * Supports search, field filtering, and date range with method chaining.
 *
 * @example
 * const where = new AuditLogQueryBuilder()
 *   .addSearch(query.search)
 *   .addFilters(query)
 *   .addDateRange(query.fromDate, query.toDate)
 *   .build();
 *
 * @see Query Builder Docs: ../../../../docs/QueryBuilder.md
 */
export class AuditLogQueryBuilder {
  private where: Prisma.AuditLogWhereInput = {
    deletedAt: null,
  };

  // 🔍 SEARCH
  addSearch(search?: string) {
    if (!search) return this;

    this.where.OR = AUDIT_LOG_SEARCHABLE_FIELDS.map((field) => ({
      [field]: {
        contains: search,
        mode: 'insensitive',
      },
    }));

    return this;
  }

  // 🎯 FILTERS (dynamic but safe)
  addFilters(filter: AuditLogQueryFilter) {
    const {
      eventType,
      serviceName,
      entity,
      entityId,
      action,
      result,
      actorId,
      actorType,
      actorEmail,
      requestId,
    } = filter;

    if (serviceName) {
      this.where.serviceName = serviceName;
    }
    if (eventType) {
      this.where.eventType = eventType;
    }

    if (entity) {
      this.where.entity = entity;
    }

    if (entityId) {
      this.where.entityId = entityId;
    }

    if (action) {
      this.where.action = action;
    }

    if (result) {
      this.where.result = result;
    }

    if (actorId) {
      this.where.actorId = actorId;
    }

    if (actorType) {
      this.where.actorType = actorType;
    }

    if (actorEmail) {
      this.where.actorEmail = {
        contains: actorEmail,
        mode: 'insensitive',
      };
    }

    if (requestId) {
      this.where.requestId = requestId;
    }

    return this;
  }

  // 📅 DATE RANGE
  addDateRange(fromDate?: Date, toDate?: Date) {
    if (!fromDate && !toDate) return this;

    this.where.createdAt = {
      ...(fromDate && { gte: fromDate }),
      ...(toDate && { lte: toDate }),
    };

    return this;
  }

  // 🏁 FINAL BUILD
  build(): Prisma.AuditLogWhereInput {
    return this.where;
  }
}
