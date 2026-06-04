import { ServiceName } from '../../../../common/constants/automation';
import { EventType } from '../../../audit-log/constants/audit-log.enum';
import { AutomationActionType } from '../../constants/automation-constants';
import {
  AutomationEvent,
  EmailActionConfig,
  NotificationActionConfig,
  WebhookActionConfig,
} from '../../types/automation-event.type';
import {
  RuntimeAutomationRule,
  RuntimeCondition,
} from '../../../rule/mappers/automation-rule.mapper';

export const createMockAutomationEvent = (
  overrides?: Partial<AutomationEvent>,
): AutomationEvent => ({
  eventId: 'evt_123',
  eventType: EventType.USER_CREATED,
  serviceName: ServiceName.FLYGHOR_AUTH,
  action: 'CREATE',
  actorId: 'actor_123',
  actorType: 'USER',
  actorEmail: 'actor@example.com',

  metadata: {
    user: {
      userId: 'user_123',
      email: 'user@example.com',
      role: 'USER',
      name: 'Test User',
    },
    payload: {},
  },

  ...overrides,
});

export const createMockEmailAction = (
  overrides?: Partial<EmailActionConfig>,
): EmailActionConfig => ({
  id: 'action_email_1',
  type: AutomationActionType.SEND_EMAIL,
  to: '{{ user.email }}',
  subject: 'Welcome {{ user.name }}',
  body: 'Hello, your payment of {{ payload.amount }} was received.',
  ...overrides,
});

export const createMockNotificationAction = (
  overrides?: Partial<NotificationActionConfig>,
): NotificationActionConfig => ({
  id: 'action_notification_1',
  type: AutomationActionType.SEND_NOTIFICATION,
  userId: '{{ user.userId }}',
  title: 'Payment Received',
  message: 'Your payment of {{ payload.amount }} was successful.',
  ...overrides,
});

export const createMockWebhookAction = (
  overrides?: Partial<WebhookActionConfig>,
): WebhookActionConfig =>
  ({
    id: 'action_webhook_1',
    type: AutomationActionType.SEND_WEBHOOK,
    url: 'https://webhook.site/test',
    method: 'POST',
    payload: {
      userId: '{{ user.userId }}',
      status: '{{ payload.status }}',
    },
    ...overrides,
  }) as any as WebhookActionConfig;

export const createMockRule = (
  overrides?: Partial<RuntimeAutomationRule>,
): RuntimeAutomationRule =>
  ({
    id: 'rule_123',
    name: 'Test Rule',
    eventType: EventType.USER_CREATED,
    serviceName: ServiceName.FLYGHOR_AUTH,
    priority: 1,
    isActive: true,
    conditions: [],
    actions: [],
    ...overrides,
  }) as any as RuntimeAutomationRule;

export const createMockCondition = (
  overrides?: Partial<RuntimeCondition>,
): RuntimeCondition =>
  ({
    field: 'payload.amount',
    operator: 'gt',
    value: 50,
    ...overrides,
  }) as any as RuntimeCondition;
