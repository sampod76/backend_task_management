import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) return false;

  return value;
}, z.boolean());

const PusherEnvSchema = z.object({
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_KEY: z.string().min(1),
  PUSHER_SECRET: z.string().min(1),
  PUSHER_CLUSTER: z.string().min(1),
  PUSHER_USE_TLS: envBoolean.default(true),
});

export const pusherConfig = () => {
  const parsed = PusherEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    throw new Error(`PUSHER ENV VALIDATION FAILED: ${message}`);
  }

  const env = parsed.data;

  return Object.freeze({
    pusher: {
      appId: env.PUSHER_APP_ID,
      key: env.PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      cluster: env.PUSHER_CLUSTER,
      useTLS: env.PUSHER_USE_TLS,
    },
  } as const);
};

export type PusherConfig = ReturnType<typeof pusherConfig>;
