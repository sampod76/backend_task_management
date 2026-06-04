import { ErrorCodes, type ErrorCode } from './error-codes';
import { HttpStatusErrorCodeMap } from './http-status-error-code.map';

export function getErrorCodeByStatus(statusCode: number): ErrorCode {
  const mappedCodes: Partial<Record<number, ErrorCode>> =
    HttpStatusErrorCodeMap;

  return mappedCodes[statusCode] ?? ErrorCodes.INTERNAL_ERROR;
}
