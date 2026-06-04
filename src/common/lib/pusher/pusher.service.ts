import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';
import {
  PusherUserInfo,
  SendChannelNotificationPayload,
  SendUserNotificationPayload,
} from './pusher.types';
import { AppException } from '../../errors';
import { ServiceName } from '../../constants/automation';

/**
 * Thin transport wrapper around the Pusher server SDK.
 *
 * Responsibilities:
 * - authorize private/presence channels for authenticated users
 * - send user-scoped notifications
 * - trigger validated channel notifications
 *
 * Flow:
 * NotificationActionService or PusherController
 * -> PusherService
 * -> Pusher HTTP API
 *
 * Warning:
 * Authorization currently checks channel_name.includes(service_name). This is a
 * coarse guard and should be replaced with an explicit channel policy if roles
 * or tenant boundaries become stricter.
 *
 * @see src/common/lib/pusher/schemas/pusher.schema.ts
 * @see src/modules/automation/services/notification-action.service.ts
 */
@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private readonly client: Pusher;
  private static readonly CHANNEL_PATTERN =
    /^(?:public|(?:public|private|presence)-[A-Za-z0-9_\-=@,.;]+)$/;

  constructor(private readonly configService: ConfigService) {
    this.client = new Pusher({
      appId: this.configService.getOrThrow<string>('PUSHER_APP_ID'),
      key: this.configService.getOrThrow<string>('PUSHER_KEY'),
      secret: this.configService.getOrThrow<string>('PUSHER_SECRET'),
      cluster: this.configService.getOrThrow<string>('PUSHER_CLUSTER'),
      useTLS:
        this.configService.get<string>('PUSHER_USE_TLS', 'true') === 'true',
    });
  }

  getClient(): Pusher {
    return this.client;
  }

  authorizeChannel(
    {
      socket_id,
      channel_name,
      service_name,
    }: { socket_id: string; channel_name: string; service_name: ServiceName },
    user: PusherUserInfo,
  ) {
    /**
     * TODO:
     * Replace substring authorization with a central channel policy that knows
     * user role, service ownership, and allowed private/presence namespaces.
     */
    if (!channel_name.includes(service_name.toLowerCase())) {
      throw AppException.forbidden(
        'You are not authorized to access this channel',
      );
    }
    return this.client.authorizeChannel(socket_id, channel_name, {
      user_id: user.userId,
      user_info: {
        role: user.role,
        username: user?.username,
        email: user?.email,
      },
    });
  }

  authorizeUser(socketId: string, user: PusherUserInfo) {
    return this.client.authenticateUser(socketId, {
      id: user.userId,
      role: user.role,
      username: user.username,
      email: user.email,
    });
  }

  async sendToUsers(payload: SendUserNotificationPayload) {
    if (!payload.userIds.length) {
      throw AppException.badRequest('At least one user ID is required');
    }

    if (!this.isPlainObject(payload.messageData)) {
      throw AppException.badRequest('Pusher messageData must be an object');
    }

    await Promise.all(
      payload.userIds.map((userId) =>
        this.client.sendToUser(userId, payload.eventName, payload.messageData),
      ),
    );

    return {
      success: true,
      sent: payload.userIds.length,
    };
  }

  async triggerChannels(payload: SendChannelNotificationPayload) {
    /**
     * Production guardrail:
     * the API schema validates controller payloads, but service callers can
     * invoke this method directly. Revalidate here before hitting Pusher.
     */
    const channels = payload.channels.map((channel) => channel.trim());

    if (!channels.length) {
      throw AppException.badRequest('At least one channel is required');
    }

    const invalidChannels = channels.filter(
      (channel) => !PusherService.CHANNEL_PATTERN.test(channel),
    );

    if (invalidChannels.length) {
      throw AppException.badRequest('Invalid Pusher channel name', {
        invalidChannels,
      });
    }

    if (!payload.eventName.trim()) {
      throw AppException.badRequest('Pusher eventName is required');
    }

    if (!this.isPlainObject(payload.messageData)) {
      throw AppException.badRequest('Pusher messageData must be an object');
    }

    this.logger.debug(
      JSON.stringify({
        message: 'Triggering Pusher channels',
        channels,
        eventName: payload.eventName,
      }),
    );

    const result = await this.client.trigger(
      channels,
      payload.eventName,
      payload.messageData,
    );

    return {
      success: true,
      result,
    };
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
