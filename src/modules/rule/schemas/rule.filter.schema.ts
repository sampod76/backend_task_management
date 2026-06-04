import { z } from 'zod';
import { OffsetPaginationSchema } from '../../../common/pagination/pagination.schema';
import { RULE_SORTABLE_FIELDS } from '../constants/rule.constants';
import { EventType } from '../../audit-log/constants/audit-log.enum';
import { ServiceName } from '../../../common/constants/automation';
/**
 * @description
 * When adding a new filter field,
 * also update query conditions in buildWhereFilter().
 *
 * @see src/modules/rule/utils/build-where-filter.ts
 */
export const RuleQueryFilterSchema = OffsetPaginationSchema.extend({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  eventType: z.enum(Object.values(EventType)).optional(),
  priority: z.coerce.number().optional(),
  serviceName: z.enum(Object.values(ServiceName)).optional(),
  sortBy: z.enum(RULE_SORTABLE_FIELDS).optional(),
});

export type RuleQueryFilter = z.infer<typeof RuleQueryFilterSchema>;
