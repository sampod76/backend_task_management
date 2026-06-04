import type { ErrorCode } from './error-codes';

export interface ErrorResponse {
  success: false;
  statusCode: number;
  code: ErrorCode;
  message: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: unknown;
  stack?: string;
}
