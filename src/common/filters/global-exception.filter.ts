import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from 'src/generated/prisma/client';
import {
  AppException,
  ErrorCodes,
  getErrorCodeByStatus,
  type ErrorCode,
  type ErrorResponse,
} from '../errors';

type RequestWithId = Request & {
  requestId?: string;
};

type NormalizedException = {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
};

type HttpExceptionPayload = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

type PrismaLikeError = {
  code: string;
  clientVersion: string;
  meta?: unknown;
};

const INVALID_DATABASE_INPUT_CODES = new Set([
  'P2000',
  'P2005',
  'P2006',
  'P2011',
  'P2012',
  'P2013',
  'P2014',
]);
const BAD_REQUEST_STATUS = Number(HttpStatus.BAD_REQUEST);
const NOT_FOUND_STATUS = Number(HttpStatus.NOT_FOUND);
const INTERNAL_SERVER_ERROR_STATUS = Number(HttpStatus.INTERNAL_SERVER_ERROR);
const ROUTE_NOT_FOUND_MESSAGE_PATTERN =
  /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT|ALL) /;

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = this.getRequestId(request);

    const normalized = this.normalizeException(exception);
    const safeNormalized = this.sanitizeForEnvironment(normalized);
    const errorResponse = this.buildErrorResponse(
      safeNormalized,
      request,
      requestId,
      exception,
    );

    this.logger.error(
      {
        requestId,
        method: request.method,
        path: request.originalUrl || request.url,
        statusCode: normalized.statusCode,
        code: normalized.code,
        message: normalized.message,
        stack: exception instanceof Error ? exception.stack : undefined,
        body: request.body,
        query: request.query,
        params: request.params,
        headers: request.headers,
      },
      'Unhandled exception',
    );

    response.status(safeNormalized.statusCode).json(errorResponse);
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private getRequestId(request: RequestWithId): string | undefined {
    const headerRequestId = request.headers['x-request-id'];

    if (typeof request.requestId === 'string' && request.requestId.length > 0) {
      return request.requestId;
    }

    if (typeof headerRequestId === 'string' && headerRequestId.length > 0) {
      return headerRequestId;
    }

    if (Array.isArray(headerRequestId) && headerRequestId.length > 0) {
      return headerRequestId[0];
    }

    return undefined;
  }

  private normalizeException(exception: unknown): NormalizedException {
    const prismaException = this.normalizePrismaException(exception);

    if (prismaException) {
      return prismaException;
    }

    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    return this.normalizeUnknownException(exception);
  }

  private normalizeHttpException(
    exception: HttpException,
  ): NormalizedException {
    const statusCode = exception.getStatus();

    if (exception instanceof AppException) {
      return {
        statusCode,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    const payload = exception.getResponse();
    const fallbackCode = getErrorCodeByStatus(statusCode);

    if (typeof payload === 'string') {
      return {
        statusCode,
        code: fallbackCode,
        message: payload,
      };
    }

    if (!this.isRecord(payload)) {
      return {
        statusCode,
        code: fallbackCode,
        message: exception.message,
      };
    }

    const httpPayload = payload as HttpExceptionPayload;
    const message = this.normalizeHttpMessage(httpPayload.message, exception);
    const isRouteNotFound =
      statusCode === NOT_FOUND_STATUS &&
      ROUTE_NOT_FOUND_MESSAGE_PATTERN.test(message);
    const isValidationError =
      statusCode === BAD_REQUEST_STATUS && Array.isArray(httpPayload.message);
    const code = isValidationError
      ? ErrorCodes.VALIDATION_ERROR
      : this.normalizeErrorCode(httpPayload.code, fallbackCode);
    const details =
      httpPayload.details ??
      (isValidationError ? { issues: httpPayload.message } : undefined);

    return {
      statusCode,
      code,
      message: this.getClientMessage({
        isRouteNotFound,
        isValidationError,
        message,
      }),
      details,
    };
  }

  private getClientMessage({
    isRouteNotFound,
    isValidationError,
    message,
  }: {
    isRouteNotFound: boolean;
    isValidationError: boolean;
    message: string;
  }): string {
    if (isRouteNotFound) {
      return 'Route not found';
    }

    if (isValidationError) {
      return 'Validation failed';
    }

    return message;
  }

  private normalizeUnknownException(exception: unknown): NormalizedException {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.INTERNAL_ERROR,
      message:
        !this.isProduction() && exception instanceof Error
          ? exception.message
          : 'Internal server error',
    };
  }

  private normalizePrismaException(
    exception: unknown,
  ): NormalizedException | undefined {
    if (!this.isPrismaKnownRequestError(exception)) {
      return undefined;
    }

    const details = this.getSafePrismaDetails(exception.meta);

    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: ErrorCodes.DB_UNIQUE_CONSTRAINT,
          message: 'Unique constraint failed',
          details,
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: ErrorCodes.DB_NOT_FOUND,
          message: 'Record not found',
          details,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: ErrorCodes.DB_FOREIGN_KEY,
          message: 'Foreign key constraint failed',
          details,
        };
      default:
        if (INVALID_DATABASE_INPUT_CODES.has(exception.code)) {
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            code: ErrorCodes.DB_INVALID_INPUT,
            message: 'Invalid database input',
            details,
          };
        }

        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCodes.DB_CONNECTION_ERROR,
          message: 'Database error',
        };
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isPrismaKnownRequestError(
    exception: unknown,
  ): exception is PrismaLikeError {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return true;
    }

    return (
      this.isRecord(exception) &&
      typeof exception.code === 'string' &&
      exception.code.startsWith('P') &&
      typeof exception.clientVersion === 'string' &&
      ('meta' in exception || 'message' in exception)
    );
  }

  private getSafePrismaDetails(meta: unknown): unknown {
    if (!this.isRecord(meta) || !('target' in meta)) {
      return undefined;
    }

    const { target } = meta;

    if (typeof target === 'string') {
      return { target };
    }

    if (
      Array.isArray(target) &&
      target.every((item) => typeof item === 'string')
    ) {
      return { target };
    }

    return undefined;
  }

  private normalizeHttpMessage(
    message: unknown,
    exception: HttpException,
  ): string {
    if (typeof message === 'string') {
      return message;
    }

    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message.join(', ');
    }

    return exception.message || 'Request failed';
  }

  private normalizeErrorCode(value: unknown, fallback: ErrorCode): ErrorCode {
    if (
      typeof value === 'string' &&
      Object.values(ErrorCodes).includes(value as ErrorCode)
    ) {
      return value as ErrorCode;
    }

    return fallback;
  }

  private sanitizeForEnvironment(
    normalized: NormalizedException,
  ): NormalizedException {
    if (
      this.isProduction() &&
      normalized.statusCode === INTERNAL_SERVER_ERROR_STATUS
    ) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Internal server error',
      };
    }

    return normalized;
  }

  private buildErrorResponse(
    normalized: NormalizedException,
    request: RequestWithId,
    requestId: string | undefined,
    exception: unknown,
  ): ErrorResponse {
    return {
      success: false,
      statusCode: normalized.statusCode,
      code: normalized.code,
      message: normalized.message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      ...(requestId ? { requestId } : {}),
      ...(normalized.details !== undefined
        ? { details: normalized.details }
        : {}),
      ...(!this.isProduction() && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    };
  }
}
