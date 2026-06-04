import { AutomationActionType } from '../../../automation/constants/automation-constants';
import { EventType } from '../../../audit-log/constants/audit-log.enum';
import { ServiceName } from '../../../../common/constants/automation';

export const createMockRuleRow = (overrides?: any) => ({
  id: 'rule_123',
  name: 'Test Rule',
  eventType: EventType.USER_CREATED,
  serviceName: ServiceName.FLYGHOR_AUTH,
  priority: 1,
  isActive: true,
  conditions: [],
  actions: [],
  ...overrides,
});

export const createMockActionRow = (overrides?: any) => ({
  id: 'action_123',
  type: AutomationActionType.SEND_EMAIL,
  emailConfig: {
    to: 'test@example.com',
    subject: 'Hello',
    body: 'World',
  },
  ...overrides,
});

export const createMockConditionRow = (overrides?: any) => ({
  id: 'cond_123',
  fieldPath: 'user.email',
  operator: 'eq',
  stringValue: 'test@example.com',
  ...overrides,
});
