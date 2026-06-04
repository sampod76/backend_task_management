import { z } from 'zod';
import { OffsetPaginationSchema } from '../../../common/pagination/pagination.schema';

export const UserQueryFilterSchema = OffsetPaginationSchema.extend({
  search: z.string().trim().optional(),
  email: z.string().trim().optional(),
  username: z.string().trim().optional(),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
  accountType: z.enum(['custom', 'google']).optional(),
  status: z.enum(['active', 'inactive', 'blocked', 'archived']).optional(),
  isEmailVerified: z.coerce.boolean().optional(),
});

export type UserQueryFilterDto = z.infer<typeof UserQueryFilterSchema>;
