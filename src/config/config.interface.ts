/**
 * CORS Configuration Interface
 */
export interface CorsConfig {
  readonly allowedOrigins: string;
  readonly credentials: boolean;
  readonly methods: string;
  readonly allowedHeaders: string;
  readonly exposedHeaders: string;
  readonly maxAge: number;
}

/**
 * Redis Configuration Interface
 */
export interface RedisConfig {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly tls: boolean;
  readonly commandTimeoutMs: number;
  readonly connectTimeoutMs: number;
  readonly queue: {
    readonly host: string;
    readonly port: number;
    readonly password?: string;
    readonly tls: boolean;
    readonly keyPrefix: string;
  };
}

/**
 * Database Configuration Interface
 */
export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password?: string;
  readonly mongodbUrl?: string;
  readonly postgresUrl: string;
}

/**
 * Application Environment Configuration
 */
export interface AppEnvironmentConfig {
  readonly env: 'development' | 'production' | 'test';
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly enableWorkers: boolean;
  readonly enableQueueDashboard: boolean;
  readonly port: number;
  readonly database: DatabaseConfig;
  readonly jwt: {
    readonly access_secret: string;
    readonly refresh_secret: string;
    readonly expiresIn: string;
  };
  readonly redis: RedisConfig;
  readonly queue: {
    readonly removeOnComplete: number;
    readonly removeOnFail: number;
    readonly attempts: number;
    readonly backoffDelay: number;
    readonly concurrency: number;
    readonly lockDurationMs: number;
    readonly stalledIntervalMs: number;
    readonly maxStalledCount: number;
    readonly limiterMax: number;
    readonly limiterDurationMs: number;
    readonly metricsMaxDataPoints: number;
    readonly idempotencyLockTtlMs: number;
  };
  readonly storage: {
    readonly aws: {
      readonly region: string;
      readonly accessKeyId: string;
      readonly secretAccessKey: string;
      readonly bucket: string;
      readonly cloudfrontUrl: string;
    };
  };
  readonly pusher: {
    readonly appId: string;
    readonly key: string;
    readonly secret: string;
    readonly cluster: string;
    readonly useTLS: boolean;
  };
  readonly email: {
    readonly provider: 'aws-ses' | 'gmail';
  };
  readonly awsSes: {
    readonly sesUserName?: string;
    readonly host: string;
    readonly smtpUserName?: string;
    readonly smtpPassword?: string;
    readonly defaultSenderEmail?: string;
    readonly port: number;
    readonly secure: boolean;
  };
  readonly gmail: {
    readonly authEmail?: string;
    readonly senderEmail?: string;
  };
  readonly cors: CorsConfig;
}

/**
 * Top-level Application Configuration
 */
export interface AppConfig {
  readonly app: AppEnvironmentConfig;
}
