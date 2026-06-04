import {
  mapActionRowsToRuntimeActions,
  mapActionsInputToCreateRows,
  mapConditionRowsToRuntimeConditions,
  mapConditionsInputToCreateRows,
} from '../mappers/automation-rule.mapper';
import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationConditionType,
  AutomationConditionValueType,
} from '../../automation/constants/automation-constants';
import type { AutomationRuleWithRelations } from '../mappers/automation-rule.mapper';

describe('automation rule mapper', () => {
  describe('mapConditionsInputToCreateRows()', () => {
    it('should map various condition inputs to relational rows with correct value types', () => {
      const inputs = [
        { field: 'user.role', operator: 'eq' as const, value: 'admin' },
        { field: 'payment.amount', operator: 'gte' as const, value: 5000 },
        { field: 'user.verified', operator: 'eq' as const, value: true },
        {
          field: 'user.role',
          operator: 'in' as const,
          value: ['admin', 'manager'],
        },
        { field: 'user.phone', operator: 'exists' as const, value: true },
      ];

      const rows = mapConditionsInputToCreateRows(inputs);
    });
  });

  describe('mapConditionRowsToRuntimeConditions()', () => {
    it('should map database rows back to runtime conditions with original IDs', () => {
      const rows = [
        {
          id: 'condition-1',
          fieldPath: 'user.role',
          conditionType: AutomationConditionType.OPERATOR,
          operator: AutomationConditionOperator.EQ,
          valueType: AutomationConditionValueType.STRING,
          stringValue: 'admin',
        },
        {
          id: 'condition-2',
          fieldPath: 'payment.amount',
          conditionType: AutomationConditionType.OPERATOR,
          operator: AutomationConditionOperator.GT,
          valueType: AutomationConditionValueType.NUMBER,
          numberValue: 5000,
        },
        {
          id: 'condition-3',
          fieldPath: 'user.phone',
          conditionType: AutomationConditionType.EXISTS,
          booleanValue: true,
        },
      ] as unknown as AutomationRuleWithRelations['conditions'];

      const result = mapConditionRowsToRuntimeConditions(rows);

      expect(result).toEqual([
        {
          id: 'condition-1',
          field: 'user.role',
          operator: 'eq',
          value: 'admin',
        },
        {
          id: 'condition-2',
          field: 'payment.amount',
          operator: 'gt',
          value: 5000,
        },
        {
          id: 'condition-3',
          field: 'user.phone',
          operator: 'exists',
          value: true,
        },
      ]);
    });
  });

  describe('mapActionsInputToCreateRows()', () => {
    it('should map action inputs to nested Prisma create structures', () => {
      const inputs = [
        {
          type: AutomationActionType.SEND_EMAIL,
          to: '{{user.email}}',
          subject: 'Welcome',
          body: 'Hello',
        },
        {
          type: AutomationActionType.SEND_NOTIFICATION,
          title: 'Alert',
          message: 'Msg',
        },
        {
          type: AutomationActionType.SEND_WEBHOOK,
          url: 'https://test.com',
          method: 'POST' as const,
        },
      ];

      const rows = mapActionsInputToCreateRows(inputs);

      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual(
        expect.objectContaining({
          type: AutomationActionType.SEND_EMAIL,
          emailConfig: {
            create: expect.objectContaining({ to: '{{user.email}}' }),
          },
        }),
      );
      expect(rows[1]).toEqual(
        expect.objectContaining({
          type: AutomationActionType.SEND_NOTIFICATION,
          notificationConfig: {
            create: expect.objectContaining({ title: 'Alert' }),
          },
        }),
      );
      expect(rows[2]).toEqual(
        expect.objectContaining({
          type: AutomationActionType.SEND_WEBHOOK,
          webhookConfig: {
            create: expect.objectContaining({ url: 'https://test.com' }),
          },
        }),
      );
    });
  });

  describe('mapActionRowsToRuntimeActions()', () => {
    it('should flat map relation rows to runtime action configs', () => {
      const rows = [
        {
          id: 'action-1',
          type: AutomationActionType.SEND_EMAIL,
          emailConfig: {
            to: 'user@test.com',
            subject: 'Sub',
            body: 'Body',
          },
        },
      ] as unknown as AutomationRuleWithRelations['actions'];

      const result = mapActionRowsToRuntimeActions(rows);

      expect(result).toEqual([
        {
          id: 'action-1',
          type: AutomationActionType.SEND_EMAIL,
          to: 'user@test.com',
          subject: 'Sub',
          body: 'Body',
        },
      ]);
    });
  });
});
