import { EnvSchema } from './env.schema';

const baseEnv = {
  NODE_ENV: 'development',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'automation_service',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/automation_service',
  JWT_SECRET: 'replace-with-at-least-16-characters',
  JWT_REFRESH_SECRET: 'replace-with-at-least-16-characters',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
  AWS_REGION: 'ap-south-1',
  AWS_ACCESS_KEY_ID: 'replace-me',
  AWS_SECRET_ACCESS_KEY: 'replace-me',
  AWS_S3_BUCKET: 'replace-me',
  AWS_CLOUDFRONT_URL: 'https://example.cloudfront.net',
  PUSHER_APP_ID: 'replace-me',
  PUSHER_KEY: 'replace-me',
  PUSHER_SECRET: 'replace-me',
  PUSHER_CLUSTER: 'ap2',
  PUSHER_USE_TLS: 'true',
  EMAIL_PROVIDER: 'aws-ses',
  AWS_SES_USER_NAME: 'developmentdev',
  AWS_SES_HOST: 'email-smtp.us-east-1.amazonaws.com',
  AWS_SES_PORT: '587',
  AWS_SES_SECURE: 'false',
  AWS_SES_SMTP_USER_NAME: 'replace-me',
  AWS_SES_SMTP_PASSWORD: 'replace-me',
  DEFAULT_SENDER_EMAIL: 'mail@techcrafters.tech',
  NODEMAILER_AUTH_EMAIL: '',
  NODEMAILER_AUTH_PASS: '',
  GMAIL_SENDER_EMAIL: '',
};

describe('EnvSchema', () => {
  it('parses false string booleans as false', () => {
    const parsed = EnvSchema.parse({
      ...baseEnv,
      REDIS_TLS: 'false',
      REDIS_QUEUE_TLS: 'false',
      ENABLE_QUEUE_DASHBOARD: 'false',
    });

    expect(parsed.REDIS_TLS).toBe(false);
    expect(parsed.REDIS_QUEUE_TLS).toBe(false);
    expect(parsed.ENABLE_QUEUE_DASHBOARD).toBe(false);
  });

  it('treats blank optional queue redis values as unset', () => {
    const parsed = EnvSchema.parse({
      ...baseEnv,
      REDIS_QUEUE_HOST: '',
      REDIS_QUEUE_PORT: '',
      REDIS_QUEUE_PASSWORD: '',
    });

    expect(parsed.REDIS_QUEUE_HOST).toBeUndefined();
    expect(parsed.REDIS_QUEUE_PORT).toBeUndefined();
    expect(parsed.REDIS_QUEUE_PASSWORD).toBeUndefined();
  });
});
