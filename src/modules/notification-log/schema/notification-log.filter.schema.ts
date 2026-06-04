import { z } from 'zod';
import { OffsetPaginationSchema } from '../../../common/pagination/pagination.schema';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationAudienceType,
} from '../constants/notification-log.enum';
import { NOTIFICATION_LOG_SORTABLE_FIELDS } from '../constants/notification-log.constants';
import { ServiceName } from '../../../common/constants/automation';

export const NotificationLogQueryFilterSchema = OffsetPaginationSchema.extend({
  search: z.string().trim().optional(),

  serviceName: z.enum(ServiceName).optional(),
  userId: z.string().uuid().optional(),

  channel: z.enum(NotificationChannel).optional(),
  type: z.enum(NotificationType).optional(),
  priority: z.enum(NotificationPriority).optional(),

  audienceType: z.enum(NotificationAudienceType).optional(),
  audienceKey: z.string().trim().optional(),

  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),

  isRead: z.coerce.boolean().optional(),

  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),

  sortBy: z.enum(NOTIFICATION_LOG_SORTABLE_FIELDS).optional(),
});

export type NotificationLogQueryFilter = z.infer<
  typeof NotificationLogQueryFilterSchema
>;
