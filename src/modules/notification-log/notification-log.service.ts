import { Injectable } from '@nestjs/common';

import { NotificationLogRepository } from './notification-log.repository';
import { Prisma } from '../../generated/prisma/client';
import { NotificationLogQueryFilter } from './schema/notification-log.filter.schema';
import { AuthPayload } from '../auth/auth.types';
import { AppException } from '../../common/errors';
import {
  buildOffsetMeta,
  buildOffsetPagination,
} from '../../common/pagination/offset-pagination';
import { NOTIFICATION_LOG_SORTABLE_FIELDS } from './constants/notification-log.constants';
import { NotificationLogQueryBuilder } from './builders/notification-log.builder';
import { GenericApiData } from '../../common/http/http-response';
import { ServiceName } from '../../common/constants/automation';

const notificationLogSelect = {
  id: true,
  userId: true,
  serviceName: true,
  channel: true,
  type: true,
  priority: true,
  audienceType: true,
  audienceKey: true,
  title: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.NotificationLogSelect;

type NotificationLogListItem = Prisma.NotificationLogGetPayload<{
  select: typeof notificationLogSelect;
}>;

/**
 * Read model service for persisted notifications.
 *
 * Flow:
 * NotificationActionService writes notification_logs
 * -> NotificationLogController
 * -> NotificationLogService
 * -> NotificationLogRepository
 *
 * Runtime notes:
 * - List/select intentionally omits message payload details to keep list
 *   responses compact.
 * - markAllAsRead applies filters before updateMany; pass serviceName filters
 *   from the API layer when multi-service isolation is required.
 *
 * Warning:
 * This service reads log rows only. Websocket delivery success/failure is not
 * persisted here.
 *
 * @see src/modules/automation/services/notification-action.service.ts
 * @see prisma/notification-log.prisma
 */
@Injectable()
export class NotificationLogService {
  constructor(private readonly repo: NotificationLogRepository) {}

  async findAll(
    query: NotificationLogQueryFilter,
    user: AuthPayload,
  ): Promise<GenericApiData<NotificationLogListItem>> {
    const pagination = buildOffsetPagination(query, [
      ...NOTIFICATION_LOG_SORTABLE_FIELDS,
    ]);

    const where = new NotificationLogQueryBuilder()
      .addSearch(query.search)
      .addFilters(query)
      .addDateRange(query.fromDate, query.toDate)
      .build();

    const [items, count] = await Promise.all([
      this.repo.findMany({ where, select: notificationLogSelect }, pagination),
      this.repo.count({ where }),
    ]);

    return {
      meta: buildOffsetMeta(count, pagination.page, pagination.limit),
      items,
    };
  }

  async findOne(
    id: string,
    serviceName: ServiceName,
    user: AuthPayload,
  ): Promise<NotificationLogListItem> {
    const result = await this.repo.findOne({
      where: {
        id_serviceName: {
          id,
          serviceName,
        },
        deletedAt: null,
      },
      select: notificationLogSelect,
    });

    if (!result) {
      throw AppException.notFound('Notification log not found');
    }

    return result;
  }

  async markAsRead(
    id: string,
    serviceName: ServiceName,
    user: AuthPayload,
  ): Promise<NotificationLogListItem> {
    const existing = await this.repo.findOne({
      where: {
        id_serviceName: {
          id,
          serviceName,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        serviceName: true,
        isRead: true,
      },
    });

    if (!existing) {
      throw AppException.notFound('Notification log not found');
    }

    if (existing.isRead) {
      return this.findOne(id, serviceName, user);
    }

    return this.repo.update({
      where: {
        id_serviceName: {
          id,
          serviceName,
        },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: notificationLogSelect,
    });
  }

  async markAllAsRead(query: NotificationLogQueryFilter, user: AuthPayload) {
    const where = new NotificationLogQueryBuilder()
      .addFilters(query)
      .addDateRange(query.fromDate, query.toDate)
      .build();

    where.deletedAt = null;
    where.isRead = false;

    return this.repo.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
