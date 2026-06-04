import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { Logger } from '@nestjs/common';
import { AppEnvironmentConfig } from '../../config/config.interface';

const logger = new Logger('CORS');

/**
 * Generates production-grade CORS configuration.
 * Using strong typing to avoid ESLint 'any' or 'unknown' errors.
 */
export function getCorsConfig(config: AppEnvironmentConfig): CorsOptions {
  const { cors, isProduction } = config;

  /**
   * Parse and sanitize origins.
   * Since env.schema guarantees a string, we can safely split.
   */
  const allowedOrigins: string[] = cors.allowedOrigins
    .split(',')
    .map((origin: string) => origin.trim())
    .filter((origin: string) => origin.length > 0);

  /**
   * Local development origins pattern
   */
  const devOrigins: RegExp[] = [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^http:\/\/172\.16\.0\.123(:\d+)?$/,
  ];

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      /**
       * Allow requests with no origin (like mobile apps or curl) in development.
       * In production, we typically require an origin for browser-based security.
       */
      if (!origin) {
        if (!isProduction) {
          return callback(null, true);
        }
        return callback(new Error('Origin header is required'), false);
      }

      /**
       * Check against the explicitly allowed origins list.
       */
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      /**
       * In development, also allow any localhost or 127.0.0.1 variation.
       */
      if (!isProduction) {
        const isDevOrigin = devOrigins.some((regex) => regex.test(origin));
        if (isDevOrigin) {
          return callback(null, true);
        }
      }

      logger.warn(`Blocked CORS request from unauthorized origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },

    credentials: cors.credentials,
    methods: cors.methods,
    allowedHeaders: cors.allowedHeaders,
    exposedHeaders: cors.exposedHeaders,
    maxAge: cors.maxAge,

    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}

/**
 * Startup logger for CORS configuration
 */
export function logCorsConfig(config: AppEnvironmentConfig): void {
  const { cors, env } = config;

  logger.log('CORS Configuration Initialized');
  logger.log(`- Mode: ${env}`);
  logger.log(`- Allowed Origins: ${cors.allowedOrigins || 'None (Strict)'}`);
  logger.log(`- Credentials: ${String(cors.credentials)}`);
  logger.log(`- Methods: ${cors.methods}`);
}
