import { z } from 'zod';
import { PushChannel, PushEvent } from '../pusher.types';
import { ServiceName } from '../../../constants/automation';

/**
 * Public API validation for Pusher endpoints.
 *
 * Flow:
 * PusherController
 * -> ZodValidationPipe
 * -> PusherService
 *
 * Update checklist:
 * - Keep channel regex aligned with NotificationActionService and PusherService.
 * - Keep PushChannel/PushEvent enum changes synchronized with frontend clients.
 * - Do not allow empty channels or event names; Pusher will reject them late and
 *   make delivery failures harder to trace.
 *
 * @see src/common/lib/pusher/pusher.controller.ts
 * @see src/common/lib/pusher/pusher.types.ts
 * @see src/modules/automation/services/notification-action.service.ts
 */
export const PusherChannelNameSchema = z
  .string()
  .trim()
  .min(1, 'Channel name is required')
  .regex(
    /^(?:public|(?:public|private|presence)-[A-Za-z0-9_\-=@,.;]+)$/,
    'Invalid Pusher channel name',
  );

export const PusherEventNameSchema = z
  .string()
  .trim()
  .min(1, 'Event name is required');

export const PusherChannelAuthSchema = z.object({
  socket_id: z.string().min(1, 'socket_id is required'),
  channel_name: PusherChannelNameSchema,
  service_name: z.enum(ServiceName),
});

export const PusherUserAuthSchema = z.object({
  socket_id: z.string().min(1, 'socket_id is required'),
});

export const SendUserNotificationSchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .min(1, 'At least one user ID is required'),
  eventName: z.union([z.nativeEnum(PushEvent), PusherEventNameSchema]),
  messageData: z.object({}).passthrough(),
});

export const SendChannelNotificationSchema = z.object({
  channels: z
    .array(z.union([z.nativeEnum(PushChannel), PusherChannelNameSchema]))
    .min(1, 'At least one channel is required'),
  eventName: z.union([z.nativeEnum(PushEvent), PusherEventNameSchema]),
  messageData: z.object({}).passthrough(),
});

export type PusherChannelAuthDto = z.infer<typeof PusherChannelAuthSchema>;
export type PusherUserAuthDto = z.infer<typeof PusherUserAuthSchema>;
export type SendUserNotificationDto = z.infer<
  typeof SendUserNotificationSchema
>;
export type SendChannelNotificationDto = z.infer<
  typeof SendChannelNotificationSchema
>;
