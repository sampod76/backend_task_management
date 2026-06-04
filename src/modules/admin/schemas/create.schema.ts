import { z } from 'zod';

export const CreateAdminSchema = z.object({
  userId: z.uuid(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(255).optional(),
  address: z.string().trim().max(255).optional(),
});

export type CreateAdminDto = z.infer<typeof CreateAdminSchema>;
