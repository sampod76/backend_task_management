import { z } from 'zod';

export const OffsetPaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type OffsetPaginationQuery = z.infer<typeof OffsetPaginationSchema>;
