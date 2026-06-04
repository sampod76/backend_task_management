import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException, ErrorCodes } from '../errors';
import { GlobalExceptionFilter } from './global-exception.filter';

const createHttpHost = (
  request: Partial<Request>,
  response: Partial<Response>,
) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  }) as ArgumentsHost;

describe('GlobalExceptionFilter', () => {
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('returns a clean error response for unmatched routes', () => {
    const filter = new GlobalExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/missing-route',
      headers: {},
    };
    const response = { status };
    const host = createHttpHost(request, response);

    filter.catch(
      new NotFoundException('Cannot GET /api/v1/missing-route'),
      host,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        code: ErrorCodes.NOT_FOUND,
        message: 'Route not found',
        path: '/api/v1/missing-route',
      }),
    );
  });

  it('preserves application not found messages', () => {
    const filter = new GlobalExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/users/unknown',
      headers: {},
    };
    const response = { status };
    const host = createHttpHost(request, response);

    filter.catch(AppException.notFound('User not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        code: ErrorCodes.NOT_FOUND,
        message: 'User not found',
        path: '/api/v1/users/unknown',
      }),
    );
  });
});
