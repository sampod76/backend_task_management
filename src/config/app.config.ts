// src/config/app.config.ts
import { AppConfig, AppEnvironmentConfig } from './config.interface';
import { EnvSchema } from './env.schema';

/**
 * Application Configuration Factory
 * Returns a strongly-typed configuration object based on environment variables.
 */
export const appConfig = (): AppConfig => {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    throw new Error(`ENV VALIDATION FAILED: ${message}`);
  }

  const env = parsed.data;
  const queueHost = env.REDIS_QUEUE_HOST ?? env.REDIS_HOST;
  const queuePort = env.REDIS_QUEUE_PORT ?? env.REDIS_PORT;
  const queuePassword = env.REDIS_QUEUE_PASSWORD ?? env.REDIS_PASSWORD;

  const config: AppEnvironmentConfig = {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    enableWorkers: env.ENABLE_WORKERS,
    enableQueueDashboard: env.ENABLE_QUEUE_DASHBOARD,
    port: env.PORT,

    database: {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      name: env.DATABASE_NAME,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      mongodbUrl: env.MONGODB_URL,
      postgresUrl: env.DATABASE_URL,
    },

    jwt: {
      access_secret: env.JWT_SECRET,
      refresh_secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },

    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      tls: env.REDIS_TLS,
      commandTimeoutMs: env.REDIS_COMMAND_TIMEOUT_MS,
      connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT_MS,
      queue: {
        host: queueHost,
        port: queuePort,
        password: queuePassword,
        tls: env.REDIS_QUEUE_TLS,
        keyPrefix: env.REDIS_QUEUE_KEY_PREFIX
          ? `${env.NODE_ENV}:${env.REDIS_QUEUE_KEY_PREFIX}`
          : `${env.REDIS_KEY_PREFIX}:queue`,
      },
    },

    queue: {
      removeOnComplete: env.QUEUE_REMOVE_ON_COMPLETE,
      removeOnFail: env.QUEUE_REMOVE_ON_FAIL,
      attempts: env.QUEUE_ATTEMPTS,
      backoffDelay: env.QUEUE_BACKOFF_DELAY,
      concurrency: env.QUEUE_CONCURRENCY,
      lockDurationMs: env.QUEUE_LOCK_DURATION_MS,
      stalledIntervalMs: env.QUEUE_STALLED_INTERVAL_MS,
      maxStalledCount: env.QUEUE_MAX_STALLED_COUNT,
      limiterMax: env.QUEUE_LIMITER_MAX,
      limiterDurationMs: env.QUEUE_LIMITER_DURATION_MS,
      metricsMaxDataPoints: env.QUEUE_METRICS_MAX_DATA_POINTS,
      idempotencyLockTtlMs: env.IDEMPOTENCY_LOCK_TTL_MS,
    },

    storage: {
      aws: {
        region: env.AWS_REGION,
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        bucket: env.AWS_S3_BUCKET,
        cloudfrontUrl: env.AWS_CLOUDFRONT_URL,
      },
    },

    pusher: {
      appId: env.PUSHER_APP_ID,
      key: env.PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      cluster: env.PUSHER_CLUSTER,
      useTLS: env.PUSHER_USE_TLS,
    },

    email: {
      provider: env.EMAIL_PROVIDER,
    },

    awsSes: {
      sesUserName: env.AWS_SES_USER_NAME,
      host: env.AWS_SES_HOST,
      smtpUserName: env.AWS_SES_SMTP_USER_NAME,
      smtpPassword: env.AWS_SES_SMTP_PASSWORD,
      defaultSenderEmail: env.DEFAULT_SENDER_EMAIL,
      port: env.AWS_SES_PORT,
      secure: env.AWS_SES_SECURE,
    },

    gmail: {
      authEmail: env.NODEMAILER_AUTH_EMAIL,
      senderEmail: env.GMAIL_SENDER_EMAIL,
    },
    cors: {
      allowedOrigins: env.CORS_ALLOWED_ORIGINS,
      credentials: env.CORS_CREDENTIALS,
      methods: env.CORS_METHODS,
      allowedHeaders: env.CORS_ALLOWED_HEADERS,
      exposedHeaders: env.CORS_EXPOSED_HEADERS,
      maxAge: env.CORS_MAX_AGE,
    },
  };

  return Object.freeze({ app: config });
};

export type { AppConfig };
