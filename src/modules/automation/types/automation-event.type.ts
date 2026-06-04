import { AuditLog } from '../../audit-log/schema/audit-log.schema';
import {
  NotificationAudienceType,
  NotificationChannel,
  NotificationPriority,
} from '../../notification-log/constants/notification-log.enum';
import { AutomationActionType } from '../constants/automation-constants';

/**
 * Runtime automation types used after rules leave the Prisma relation model.
 *
 * Flow:
 * Zod rule input
 * -> automation-rule.mapper.ts
 * -> AutomationActionConfig union
 * -> RuleEngineService switch(action.type)
 * -> action-specific service
 *
 * Update checklist:
 * - Add a new action type here, in AutomationActionType, in Zod schemas, in
 *   Prisma action config models, and in mapper parse/runtime functions.
 * - Keep notification websocket fields synchronized with Pusher validation.
 *
 * Warning:
 * Optional fields here can represent either "not configured" or "DB null was
 * normalized to undefined". Action services must validate required field
 * combinations before side effects.
 *
 * @see src/modules/rule/mappers/automation-rule.mapper.ts
 * @see src/modules/rule/schemas/create-rule.schema.ts
 */

export type ActorType = 'USER' | 'ADMIN' | 'SYSTEM' | 'SERVICE';

export interface AutomationActor {
  id?: string;
  type?: ActorType;
  email?: string;
}

export interface AutomationRequestContext {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ChangedFieldValue {
  from?: unknown;
  to?: unknown;
}

export type AutomationEvent = AuditLog;

export interface EmailActionConfig {
  id?: string;
  type: typeof AutomationActionType.SEND_EMAIL;
  to: string;
  from?: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}

export interface NotificationActionConfig {
  id?: string;
  type: typeof AutomationActionType.SEND_NOTIFICATION;

  userId?: string;

  channel?: NotificationChannel;
  /**
   * Pusher channel used for channel-scoped delivery. It is optional because
   * historical DB rows may be null, but eventName + missing pushChannel should
   * be treated as an invalid delivery configuration.
   */
  pushChannel?: string;
  eventName?: string;
  priority?: NotificationPriority;

  audienceType?: NotificationAudienceType;
  audienceKey?: string;

  title: string;
  message: string;
  payload?: Record<string, unknown>;

  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export interface WebhookActionConfig {
  id?: string;
  type: typeof AutomationActionType.SEND_WEBHOOK;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  timeoutMs?: number;
}

export type AutomationActionConfig =
  | EmailActionConfig
  | NotificationActionConfig
  | WebhookActionConfig;
