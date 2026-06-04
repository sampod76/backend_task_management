import { z } from 'zod';
import { OffsetPaginationSchema } from '../../../common/pagination/pagination.schema';

import { AUDIT_LOG_SORTABLE_FIELDS } from '../constants/audit-log.constants';
import { ServiceName } from '../../../common/constants/automation';
import { EventType } from '../constants/audit-log.enum';
const SafeStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  // basic sanitize against obvious injection payloads
  .regex(/^[a-zA-Z0-9_\-.:@/ ]+$/, 'Invalid characters detected');

const SearchSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  // prevent wildcard abuse / regex-like heavy payloads
  .regex(/^[a-zA-Z0-9_\-.:@/ ]+$/, 'Invalid search query');

export const AuditLogQueryFilterSchema = OffsetPaginationSchema.extend({
  // 🔍 global search
  search: SearchSchema.optional(),

  // 🎯 filters
  eventId: z.uuid().optional(),

  entity: SafeStringSchema.optional(),

  entityId: z.uuid().optional(),

  // 🎯 filters

  eventType: z.enum(Object.values(EventType)).optional(), // তুমি string use করছো model এ
  serviceName: z.enum(Object.values(ServiceName)).optional(),

  action: SafeStringSchema.optional(), // UPDATE, DELETE

  result: z.enum(['SUCCESS', 'FAILED']).optional(),

  actorId: z.string().optional(),
  actorType: z.string().optional(),
  actorEmail: z.string().optional(),

  requestId: z.string().optional(),

  // 📅 date range
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),

  // 🔄 sorting
  sortBy: z.enum(AUDIT_LOG_SORTABLE_FIELDS).optional(),
});

export type AuditLogQueryFilter = z.infer<typeof AuditLogQueryFilterSchema>;
