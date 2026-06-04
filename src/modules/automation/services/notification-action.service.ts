import { Injectable, Logger } from '@nestjs/common';

import {
  AutomationEvent,
  NotificationActionConfig,
} from '../types/automation-event.type';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { PusherService } from '../../../common/lib/pusher/pusher.service';
import { PushEvent } from '../../../common/lib/pusher/pusher.types';
import { ServiceName } from '../../../common/constants/automation';

/**
 * Executes SEND_NOTIFICATION automation actions.
 *
 * Flow:
 * RuleEngineService
 * -> NotificationActionService.send()
 * -> notification_logs create
 * -> PusherService.sendToUsers() when userId exists
 * -> PusherService.triggerChannels() when eventName + pushChannel exist
 *
 * Side effects:
 * - Always persists a notification log row.
 * - May deliver a user-scoped Pusher event.
 * - May deliver a channel-scoped Pusher event.
 *
 * Warning:
 * pushChannel is nullable in historical DB rows. Do not add a fallback channel
 * here; missing or invalid channels are logged and skipped to avoid routing
 * sensitive notifications to the wrong audience.
 *
 * @see src/modules/rule/mappers/automation-rule.mapper.ts
 * @see src/common/lib/pusher/pusher.service.ts
 * @see prisma/notification-log.prisma
 */
@Injectable()
export class NotificationActionService {
  private readonly logger = new Logger(NotificationActionService.name);
  private static readonly PUSHER_CHANNEL_PATTERN =
    /^(?:public|(?:public|private|presence)-[A-Za-z0-9_\-=@,.;]+)$/;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pusherService: PusherService,
  ) {}

  async send(
    action: NotificationActionConfig,
    event: AutomationEvent,
    context?: { serviceName?: ServiceName },
  ) {
    /**
     * User targeting priority:
     * explicit action.userId -> audienceKey -> metadata.user.id -> actorId.
     *
     * Runtime note:
     * Some fixtures use metadata.user.userId. That path is not read here, so
     * rules needing that value should template userId explicitly.
     */
    const userId =
      action.userId ??
      action.audienceKey ??
      this.getStringByPath(event.metadata, 'user.id') ??
      event.actorId;
    const pushChannel = this.normalizePushChannel(action.pushChannel);

    const notification = await this.prisma.client.notificationLog.create({
      data: {
        userId,
        serviceName: context?.serviceName ?? event.serviceName,
        channel: action.channel ?? 'APP',
        pushChannel,

        eventName: action.eventName,
        title: action.title,
        message: action.message,
        payload: action.payload as Prisma.InputJsonValue | undefined,
        audienceType: action.audienceType ?? 'USER',
        audienceKey: action.audienceKey,
        type: 'INFO',
        priority: action.priority ?? 'NORMAL',
        entityType: action.entityType,
        entityId: action.entityId,
        actionUrl: action.actionUrl,
      },
    });

    // এখানে future-এ WebSocket / Push notification বসবে
    this.logger.log(
      `Notification saved id=${notification.id} eventId=${event.eventId}`,
    );

    if (notification.userId) {
      await this.pusherService.sendToUsers({
        userIds: [notification.userId],
        eventName: PushEvent.USER_NOTIFICATION,
        messageData: {
          title: notification.title,
          message: notification.message,
          payload: notification.payload,
        },
      });
    }
    if (notification.eventName) {
      if (!notification.pushChannel) {
        this.logger.warn(
          JSON.stringify({
            message: 'Skipping pusher channel trigger: missing pushChannel',
            notificationId: notification.id,
            eventId: event.eventId,
            actionId: action.id,
            eventName: notification.eventName,
          }),
        );

        return notification;
      }

      await this.pusherService.triggerChannels({
        channels: [notification.pushChannel],
        eventName: notification.eventName,
        messageData: {
          title: notification.title,
          message: notification.message,
          payload: notification.payload,
        },
      });
    }

    return notification;
  }

  private normalizePushChannel(
    pushChannel: string | undefined,
  ): string | undefined {
    /**
     * Normalizes channel names before they are persisted into notification_logs.
     * The Pusher service performs the same validation again at the transport
     * boundary because logs may be created from legacy rule rows.
     */
    const channel = pushChannel?.trim();

    if (!channel) {
      return undefined;
    }

    if (!NotificationActionService.PUSHER_CHANNEL_PATTERN.test(channel)) {
      this.logger.warn(
        JSON.stringify({
          message: 'Ignoring invalid pushChannel on notification action',
          pushChannel,
        }),
      );

      return undefined;
    }

    return channel;
  }

  private getStringByPath(source: unknown, path: string): string | undefined {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }

      return undefined;
    }, source);

    return typeof value === 'string' ? value : undefined;
  }
}
