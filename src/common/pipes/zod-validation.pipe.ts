import { PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
import { AppException } from '../errors';

/**
 * Per-route Zod validation pipe.
 *
 * Purpose:
 * Keep DTO validation close to controllers without relying on class-transformer
 * or class-validator for schema-heavy flows such as automation rules.
 *
 * Runtime notes:
 * - Returns parsed data, including Zod defaults/transforms.
 * - Throws AppException.validation with compact issue paths for API clients.
 *
 * Warning:
 * Zod object strictness is controlled by each schema. If a schema is not
 * .strict(), unknown fields may pass through.
 *
 * @see src/modules/rule/schemas/create-rule.schema.ts
 * @see src/common/lib/pusher/schemas/pusher.schema.ts
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      }));

      throw AppException.validation('Validation failed', { issues });
    }
    return result.data;
  }
}
