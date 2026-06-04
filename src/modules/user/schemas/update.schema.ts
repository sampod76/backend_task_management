import { z } from 'zod';

export const UpdateUserSchema = z
  .object({
    email: z.email().toLowerCase().optional(),
    username: z.string().trim().min(3).max(50).optional(),
    password: z.string().min(8).max(100).optional(),
    role: z.enum(['user', 'admin', 'super_admin']).optional(),
    accountType: z.enum(['custom', 'google']).optional(),
    status: z.enum(['active', 'inactive', 'blocked', 'archived']).optional(),
    isEmailVerified: z.boolean().optional(),
    admin: z
      .object({
        firstName: z.string().trim().min(1).max(100).optional(),
        lastName: z.string().trim().min(1).max(100).optional(),
        phone: z.string().trim().max(255).optional(),
        address: z.string().trim().max(255).optional(),
      })
      .optional(),
  })
  .strict();

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
