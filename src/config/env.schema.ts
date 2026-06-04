// src/config/env.schema.ts
import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) return false;

  return value;
}, z.boolean());

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, z.string().optional());

const optionalEmailString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, z.string().email().optional());

const optionalNumber = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, z.coerce.number().optional());

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().default(5050),
    ENABLE_WORKERS: envBoolean.default(false),
    ENABLE_QUEUE_DASHBOARD: envBoolean.default(false),
    DATABASE_HOST: z.string(),
    DATABASE_PORT: z.coerce.number(),
    DATABASE_NAME: z.string(),
    DATABASE_USER: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().default('1d'),
    MONGODB_URL: z.string().optional(),
    //
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: optionalNonEmptyString,
    REDIS_TLS: envBoolean.default(false),
    REDIS_KEY_PREFIX: z.string().default('automation-service'),
    REDIS_QUEUE_HOST: optionalNonEmptyString,
    REDIS_QUEUE_PORT: optionalNumber,
    REDIS_QUEUE_PASSWORD: optionalNonEmptyString,
    REDIS_QUEUE_TLS: envBoolean.default(false),
    REDIS_QUEUE_KEY_PREFIX: optionalNonEmptyString,
    REDIS_COMMAND_TIMEOUT_MS: z.coerce.number().min(1000).default(20000),
    REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().min(1000).default(15000),
    //
    QUEUE_REMOVE_ON_COMPLETE: z.coerce.number().min(0).default(1000),
    QUEUE_REMOVE_ON_FAIL: z.coerce.number().min(0).default(5000),
    QUEUE_ATTEMPTS: z.coerce.number().min(1).max(5).default(5),
    QUEUE_BACKOFF_DELAY: z.coerce.number().min(500).default(3000),
    QUEUE_CONCURRENCY: z.coerce.number().min(1).max(50).default(5),
    QUEUE_LOCK_DURATION_MS: z.coerce.number().min(30000).default(120000),
    QUEUE_STALLED_INTERVAL_MS: z.coerce.number().min(5000).default(30000),
    QUEUE_MAX_STALLED_COUNT: z.coerce.number().min(0).max(3).default(1),
    QUEUE_LIMITER_MAX: z.coerce.number().min(1).default(100),
    QUEUE_LIMITER_DURATION_MS: z.coerce.number().min(100).default(1000),
    QUEUE_METRICS_MAX_DATA_POINTS: z.coerce.number().min(100).default(1000),
    IDEMPOTENCY_LOCK_TTL_MS: z.coerce.number().min(30000).default(900000),
    //
    AWS_REGION: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_S3_BUCKET: z.string(),
    AWS_CLOUDFRONT_URL: z.string().url(),
    //
    PUSHER_APP_ID: z.string().min(1),
    PUSHER_KEY: z.string().min(1),
    PUSHER_SECRET: z.string().min(1),
    PUSHER_CLUSTER: z.string().min(1),
    PUSHER_USE_TLS: envBoolean.default(true),
    //
    EMAIL_PROVIDER: z.enum(['aws-ses', 'gmail']).default('aws-ses'),
    AWS_SES_USER_NAME: optionalNonEmptyString,
    AWS_SES_HOST: z
      .string()
      .min(1)
      .default('email-smtp.us-east-1.amazonaws.com'),
    AWS_SES_SMTP_USER_NAME: optionalNonEmptyString,
    AWS_SES_SMTP_PASSWORD: optionalNonEmptyString,
    AWS_SES_PORT: z.coerce.number().default(587),
    AWS_SES_SECURE: envBoolean.default(false),
    DEFAULT_SENDER_EMAIL: optionalEmailString,
    NODEMAILER_AUTH_EMAIL: optionalEmailString,
    NODEMAILER_AUTH_PASS: optionalNonEmptyString,
    GMAIL_SENDER_EMAIL: optionalEmailString,
    // CORS
    CORS_ALLOWED_ORIGINS: z.string().default(''),
    CORS_CREDENTIALS: envBoolean.default(true),
    CORS_METHODS: z.string().default('GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'),
    CORS_ALLOWED_HEADERS: z
      .string()
      .default('Content-Type,Authorization,X-Requested-With,X-Request-Id'),
    CORS_EXPOSED_HEADERS: z.string().default('X-Request-Id'),
    CORS_MAX_AGE: z.coerce.number().default(86400),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER === 'aws-ses') {
      if (!env.AWS_SES_SMTP_USER_NAME) {
        ctx.addIssue({
          code: 'custom',
          path: ['AWS_SES_SMTP_USER_NAME'],
          message: 'Required when EMAIL_PROVIDER=aws-ses',
        });
      }

      if (!env.AWS_SES_SMTP_PASSWORD) {
        ctx.addIssue({
          code: 'custom',
          path: ['AWS_SES_SMTP_PASSWORD'],
          message: 'Required when EMAIL_PROVIDER=aws-ses',
        });
      }

      if (!env.DEFAULT_SENDER_EMAIL) {
        ctx.addIssue({
          code: 'custom',
          path: ['DEFAULT_SENDER_EMAIL'],
          message: 'Required when EMAIL_PROVIDER=aws-ses',
        });
      }
    }

    if (env.EMAIL_PROVIDER === 'gmail') {
      if (!env.NODEMAILER_AUTH_EMAIL) {
        ctx.addIssue({
          code: 'custom',
          path: ['NODEMAILER_AUTH_EMAIL'],
          message: 'Required when EMAIL_PROVIDER=gmail',
        });
      }

      if (!env.NODEMAILER_AUTH_PASS) {
        ctx.addIssue({
          code: 'custom',
          path: ['NODEMAILER_AUTH_PASS'],
          message: 'Required when EMAIL_PROVIDER=gmail',
        });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;
