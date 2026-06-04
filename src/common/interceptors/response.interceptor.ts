import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { Response } from 'express';
import type { AuthenticatedRequest } from 'src/modules/auth/auth.types';

type ApiResponseEnvelope = {
  success?: boolean;
  statusCode?: number;
  data?: unknown;
  meta?: unknown;
};

type ItemsEnvelope = {
  items: unknown;
};

type MetaEnvelope = {
  meta: unknown;
};

const hasItems = (data: unknown): data is ItemsEnvelope =>
  typeof data === 'object' && data !== null && 'items' in data;

const hasMeta = (data: unknown): data is MetaEnvelope =>
  typeof data === 'object' && data !== null && 'meta' in data;

/**
 * Global response envelope interceptor.
 *
 * Flow:
 * Controller return value
 * -> ResponseInterceptor
 * -> { success, statusCode, message, meta, data, timestamp, requestId }
 *
 * Runtime notes:
 * - Objects shaped as { items, meta } become paginated envelopes.
 * - Already formatted responses with success=true and statusCode are preserved.
 * - requestId comes from requestIdMiddleware.
 *
 * Warning:
 * Returning an object with an "items" property intentionally moves that value
 * into data. Avoid using top-level items for non-list payloads.
 *
 * @see src/common/middlewares/request-id.middleware.ts
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<AuthenticatedRequest>();
    const res = ctx.getResponse<Response>();

    const requestId = req.requestId;

    return next.handle().pipe(
      map((data: unknown) => {
        const response = data as ApiResponseEnvelope | null | undefined;

        // ✅ Already formatted → return as is
        if (response?.success === true && response.statusCode) {
          return data;
        }

        // ✅ Safe extraction
        const safeData = hasItems(data) ? data.items : data;

        const safeMeta = hasMeta(data) ? data.meta : undefined;

        return {
          success: true,
          statusCode: res.statusCode || 200,
          message: 'Request successful',
          meta: safeMeta,
          data: safeData,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
    );
  }
}
