import { z } from 'zod';
import { OffsetPaginationSchema } from '../../../common/pagination/pagination.schema';

export const AdminQueryFilterSchema = OffsetPaginationSchema.extend({
  search: z.string().trim().optional(),
  userId: z.uuid().optional(),
  phone: z.string().trim().optional(),
});

export type AdminQueryFilterDto = z.infer<typeof AdminQueryFilterSchema>;
