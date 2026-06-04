import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export interface JwtUserPayload {
  userId: string;
  role: string;
}

/**
 * Passport JWT guard wrapper.
 *
 * Purpose:
 * Normalize failed JWT authentication into UnauthorizedException and return the
 * typed user payload for downstream decorators/guards.
 *
 * Warning:
 * The cast is only as safe as JwtStrategy.validate(). Keep JwtUserPayload in
 * sync with the strategy return shape and AuthPayload.
 *
 * @see src/modules/auth/strategies/jwt.strategy.ts
 * @see src/modules/auth/decorators/currentUser.decorator.ts
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtUserPayload>(
    err: unknown,
    user: unknown,
    info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err || !user) {
      throw err instanceof Error
        ? err
        : new UnauthorizedException((info as Error)?.message || 'Unauthorized');
    }

    return user as TUser; // ✅ SAFE CAST
  }
}
