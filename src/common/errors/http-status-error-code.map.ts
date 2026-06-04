import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from './error-codes';

export const HttpStatusErrorCodeMap = {
  [HttpStatus.BAD_REQUEST]: ErrorCodes.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCodes.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCodes.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCodes.NOT_FOUND,
  [HttpStatus.METHOD_NOT_ALLOWED]: ErrorCodes.METHOD_NOT_ALLOWED,
  [HttpStatus.NOT_ACCEPTABLE]: ErrorCodes.NOT_ACCEPTABLE,
  [HttpStatus.REQUEST_TIMEOUT]: ErrorCodes.REQUEST_TIMEOUT,
  [HttpStatus.CONFLICT]: ErrorCodes.CONFLICT,
  [HttpStatus.GONE]: ErrorCodes.GONE,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCodes.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: ErrorCodes.UNSUPPORTED_MEDIA_TYPE,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCodes.UNPROCESSABLE_ENTITY,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCodes.TOO_MANY_REQUESTS,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCodes.INTERNAL_ERROR,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCodes.SERVICE_UNAVAILABLE,
  [HttpStatus.GATEWAY_TIMEOUT]: ErrorCodes.GATEWAY_TIMEOUT,
} as const;
