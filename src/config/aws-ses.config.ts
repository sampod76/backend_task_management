import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) return false;

  return value;
}, z.boolean());

const AwsSesEnvSchema = z.object({
  AWS_SES_USER_NAME: z.string().optional(),
  AWS_SES_HOST: z.string().min(1).default('email-smtp.us-east-1.amazonaws.com'),
  AWS_SES_SMTP_USER_NAME: z.string().min(1),
  AWS_SES_SMTP_PASSWORD: z.string().min(1),
  AWS_SES_PORT: z.coerce.number().default(587),
  AWS_SES_SECURE: envBoolean.default(false),
  DEFAULT_SENDER_EMAIL: z.string().email(),
});

export const awsSesConfig = () => {
  const parsed = AwsSesEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    throw new Error(`AWS SES ENV VALIDATION FAILED: ${message}`);
  }

  const env = parsed.data;

  return Object.freeze({
    awsSes: {
      sesUserName: env.AWS_SES_USER_NAME,
      host: env.AWS_SES_HOST,
      smtpUserName: env.AWS_SES_SMTP_USER_NAME,
      smtpPassword: env.AWS_SES_SMTP_PASSWORD,
      defaultSenderEmail: env.DEFAULT_SENDER_EMAIL,
      port: env.AWS_SES_PORT,
      secure: env.AWS_SES_SECURE,
    },
  } as const);
};

export type AwsSesConfig = ReturnType<typeof awsSesConfig>;
