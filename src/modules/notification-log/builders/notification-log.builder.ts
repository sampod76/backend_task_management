import { Prisma } from '../../../generated/prisma/client';
import { NOTIFICATION_LOG_SEARCHABLE_FIELDS } from '../constants/notification-log.constants';
import { NotificationLogQueryFilter } from '../schema/notification-log.filter.schema';

/**
 * NotificationLogQueryBuilder
 *
 * Converts API query filters into Prisma-compatible `where` conditions.
 * Supports search, field filtering, and date range with method chaining.
 */
export class NotificationLogQueryBuilder {
  private where: Prisma.NotificationLogWhereInput = {
    deletedAt: null,
  };

  addSearch(search?: string) {
    const normalizedSearch = search?.trim();

    if (!normalizedSearch) return this;

    this.where.OR = NOTIFICATION_LOG_SEARCHABLE_FIELDS.map((field) => ({
      [field]: {
        contains: normalizedSearch,
        mode: 'insensitive',
      },
    }));

    return this;
  }

  addFilters(filter: NotificationLogQueryFilter) {
    const {
      serviceName,
      userId,
      channel,
      type,
      priority,
      audienceType,
      audienceKey,
      entityType,
      entityId,
      isRead,
    } = filter;

    if (serviceName) {
      this.where.serviceName = serviceName;
    }

    if (userId) {
      this.where.userId = userId;
    }

    if (channel) {
      this.where.channel = channel;
    }

    if (type) {
      this.where.type = type;
    }

    if (priority) {
      this.where.priority = priority;
    }

    if (audienceType) {
      this.where.audienceType = audienceType;
    }

    if (audienceKey) {
      this.where.audienceKey = audienceKey;
    }

    if (entityType) {
      this.where.entityType = entityType;
    }

    if (entityId) {
      this.where.entityId = entityId;
    }

    if (typeof isRead === 'boolean') {
      this.where.isRead = isRead;
    }

    return this;
  }

  addDateRange(fromDate?: Date, toDate?: Date) {
    if (!fromDate && !toDate) return this;

    this.where.createdAt = {
      ...(fromDate && { gte: fromDate }),
      ...(toDate && { lte: toDate }),
    };

    return this;
  }

  build(): Prisma.NotificationLogWhereInput {
    return this.where;
  }
}
