import { z } from 'zod';

export const CreateUserSchema = z
  .object({
    email: z.email().toLowerCase(),
    username: z.string().trim().min(3).max(50),
    password: z.string().min(8).max(100),
    role: z.enum(['user', 'admin', 'super_admin']).default('user'),
    accountType: z.enum(['custom', 'google']).default('custom'),
    status: z
      .enum(['active', 'inactive', 'blocked', 'archived'])
      .default('active'),
    isEmailVerified: z.boolean().default(false),
    admin: z
      .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        phone: z.string().trim().max(255).optional(),
        address: z.string().trim().max(255).optional(),
      })
      .optional(),
  })
  .superRefine((dto, ctx) => {
    if (dto.role === 'admin' && !dto.admin) {
      ctx.addIssue({
        code: 'custom',
        path: ['admin'],
        message: 'Admin profile is required for admin users',
      });
    }
  });

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
