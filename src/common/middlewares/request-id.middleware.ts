import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { AuthenticatedRequest } from 'src/modules/auth/auth.types';

/**
 * Attaches a request id to every HTTP request and response.
 *
 * Flow:
 * main.ts
 * -> requestIdMiddleware
 * -> controllers/interceptors/loggers
 * -> x-request-id response header
 *
 * Runtime note:
 * Upstream x-request-id is trusted when present. If this service is exposed to
 * untrusted clients directly, consider validating length/charset before using
 * it in logs.
 *
 * @see src/common/interceptors/response.interceptor.ts
 * @see src/common/interceptors/logging.interceptor.ts
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as AuthenticatedRequest).requestId = requestId;

  res.setHeader('x-request-id', requestId);
  next();
}
