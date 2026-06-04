import { z } from 'zod';

export const UpdateAdminSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(255).optional(),
    address: z.string().trim().max(255).optional(),
  })
  .strict();

export type UpdateAdminDto = z.infer<typeof UpdateAdminSchema>;
