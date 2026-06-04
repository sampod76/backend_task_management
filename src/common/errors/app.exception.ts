import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes, type ErrorCode } from './error-codes';

export class AppException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(
    code: ErrorCode,
    status: HttpStatus,
    message: string,
    details?: unknown,
  ) {
    super({ code, message, details }, status);

    this.code = code;
    this.details = details;

    Error.captureStackTrace?.(this, AppException);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new AppException(
      ErrorCodes.BAD_REQUEST,
      HttpStatus.BAD_REQUEST,
      message,
      details,
    );
  }

  static validation(message = 'Validation failed', details?: unknown) {
    return new AppException(
      ErrorCodes.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      message,
      details,
    );
  }

  static unauthorized(message = 'Unauthorized', details?: unknown) {
    return new AppException(
      ErrorCodes.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
      message,
      details,
    );
  }

  static forbidden(message = 'Forbidden', details?: unknown) {
    return new AppException(
      ErrorCodes.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      message,
      details,
    );
  }

  static notFound(message = 'Resource not found', details?: unknown) {
    return new AppException(
      ErrorCodes.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      message,
      details,
    );
  }

  static conflict(message = 'Conflict', details?: unknown) {
    return new AppException(
      ErrorCodes.CONFLICT,
      HttpStatus.CONFLICT,
      message,
      details,
    );
  }

  static unprocessableEntity(
    message = 'Unprocessable entity',
    details?: unknown,
  ) {
    return new AppException(
      ErrorCodes.UNPROCESSABLE_ENTITY,
      HttpStatus.UNPROCESSABLE_ENTITY,
      message,
      details,
    );
  }

  static tooManyRequests(message = 'Too many requests', details?: unknown) {
    return new AppException(
      ErrorCodes.TOO_MANY_REQUESTS,
      HttpStatus.TOO_MANY_REQUESTS,
      message,
      details,
    );
  }

  static internal(message = 'Internal server error', details?: unknown) {
    return new AppException(
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      details,
    );
  }

  static serviceUnavailable(
    message = 'Service unavailable',
    details?: unknown,
  ) {
    return new AppException(
      ErrorCodes.SERVICE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
      message,
      details,
    );
  }

  static custom(
    code: ErrorCode,
    status: HttpStatus,
    message: string,
    details?: unknown,
  ) {
    return new AppException(code, status, message, details);
  }
}
