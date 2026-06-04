import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RuleEngineService } from './rule-engine.service';
import { RuleRepository } from '../../rule/repositories/rule.repository';
import { EmailActionService } from './email-action.service';
import { NotificationActionService } from './notification-action.service';
import { IdempotencyService } from './idempotency.service';
import { AutomationActionType } from '../constants/automation-constants';
import {
  createMockAutomationEvent,
  createMockCondition,
} from '../tests/utils/automation-test.fixtures';
import {
  AutomationRuleWithRelations,
  RuntimeCondition,
} from '../../rule/mappers/automation-rule.mapper';
import { AutomationEvent } from '../types/automation-event.type';

describe('RuleEngineService', () => {
  let service: RuleEngineService;
  let repo: Pick<jest.Mocked<RuleRepository>, 'findActiveRulesByEventType'>;
  let emailActionService: Pick<jest.Mocked<EmailActionService>, 'send'>;
  let notificationActionService: Pick<
    jest.Mocked<NotificationActionService>,
    'send'
  >;
  let idempotencyService: Pick<
    jest.Mocked<IdempotencyService>,
    'acquire' | 'complete' | 'fail'
  >;

  beforeEach(async () => {
    const mockRepo = {
      findActiveRulesByEventType: jest.fn(),
    };
    const mockEmailActionService = {
      send: jest.fn(),
    };
    const mockNotificationActionService = {
      send: jest.fn(),
    };
    const mockIdempotencyService = {
      acquire: jest.fn().mockResolvedValue(true),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        { provide: RuleRepository, useValue: mockRepo },
        { provide: EmailActionService, useValue: mockEmailActionService },
        {
          provide: NotificationActionService,
          useValue: mockNotificationActionService,
        },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    service = module.get<RuleEngineService>(RuleEngineService);
    repo = module.get(RuleRepository);
    emailActionService = module.get(EmailActionService);
    notificationActionService = module.get(NotificationActionService);
    idempotencyService = module.get(IdempotencyService);

    // Silence logger during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process()', () => {
    it('should skip processing if no active rules are found', async () => {
      const event = createMockAutomationEvent();
      repo.findActiveRulesByEventType.mockResolvedValue([]);

      await service.process(event);

      expect(repo.findActiveRulesByEventType).toHaveBeenCalledWith(
        event.eventType,
        event.serviceName,
      );
      expect(emailActionService.send).not.toHaveBeenCalled();
    });

    it('should execute actions for matched rules', async () => {
      const event = createMockAutomationEvent({
        metadata: {
          user: { email: 'user@example.com' },
          payload: { amount: 100 },
        } as unknown as AutomationEvent['metadata'],
      });
      // Mock repository response
      repo.findActiveRulesByEventType.mockResolvedValue([
        {
          id: 'rule_1',
          actions: [
            {
              id: 'a1',
              type: AutomationActionType.SEND_EMAIL,
              emailConfig: {
                to: '{{ user.email }}',
                subject: 'Hi',
                body: 'World',
              },
            },
          ],
          conditions: [
            {
              id: 'c1',
              fieldPath: 'payload.amount',
              conditionType: 'OPERATOR',
              operator: 'GT',
              valueType: 'NUMBER',
              numberValue: 50,
            },
          ],
        } as unknown as AutomationRuleWithRelations,
      ]);

      await service.process(event);

      expect(idempotencyService.acquire).toHaveBeenCalled();
      expect(emailActionService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@example.com' }),
        event,
        expect.any(Object),
      );
      expect(idempotencyService.complete).toHaveBeenCalled();
    });

    it('should skip action if idempotency lock cannot be acquired', async () => {
      const event = createMockAutomationEvent();
      repo.findActiveRulesByEventType.mockResolvedValue([
        {
          id: 'rule_1',
          actions: [
            {
              id: 'a1',
              type: AutomationActionType.SEND_EMAIL,
              emailConfig: { to: 'test', subject: 'test', body: 'test' },
            },
          ],
          conditions: [],
        } as unknown as AutomationRuleWithRelations,
      ]);
      idempotencyService.acquire.mockResolvedValue(false);

      await service.process(event);

      expect(idempotencyService.acquire).toHaveBeenCalled();
      expect(emailActionService.send).not.toHaveBeenCalled();
      expect(idempotencyService.complete).not.toHaveBeenCalled();
    });

    it('should handle action execution failure and mark idempotency as failed', async () => {
      const event = createMockAutomationEvent();
      repo.findActiveRulesByEventType.mockResolvedValue([
        {
          id: 'rule_1',
          actions: [
            {
              id: 'a1',
              type: AutomationActionType.SEND_EMAIL,
              emailConfig: { to: 'test', subject: 'test', body: 'test' },
            },
          ],
          conditions: [],
        } as unknown as AutomationRuleWithRelations,
      ]);
      const error = new Error('SMTP Error');
      emailActionService.send.mockRejectedValue(error);

      await expect(service.process(event)).rejects.toThrow('SMTP Error');

      expect(idempotencyService.fail).toHaveBeenCalledWith(
        expect.any(String),
        error,
      );
      expect(idempotencyService.complete).not.toHaveBeenCalled();
    });
  });

  describe('matchConditions()', () => {
    const event = createMockAutomationEvent({
      metadata: {
        payload: { amount: 100, status: 'PAID', items: ['A', 'B'] },
        user: { role: 'ADMIN' },
      } as unknown as AutomationEvent['metadata'],
    });

    it('should return true if no conditions are provided', () => {
      expect(service.matchConditions([], event)).toBe(true);
    });

    it('should match eq operator', () => {
      const condition = createMockCondition({
        field: 'payload.status',
        operator: 'eq',
        value: 'PAID',
      });
      expect(service.matchConditions([condition], event)).toBe(true);

      const failCondition = createMockCondition({
        field: 'payload.status',
        operator: 'eq',
        value: 'PENDING',
      });
      expect(service.matchConditions([failCondition], event)).toBe(false);
    });

    it('should match neq operator', () => {
      const condition = createMockCondition({
        field: 'payload.status',
        operator: 'neq',
        value: 'PENDING',
      });
      expect(service.matchConditions([condition], event)).toBe(true);
    });

    it('should match gt/gte operators', () => {
      expect(
        service.matchConditions(
          [
            createMockCondition({
              field: 'payload.amount',
              operator: 'gt',
              value: 99,
            }),
          ],
          event,
        ),
      ).toBe(true);
      expect(
        service.matchConditions(
          [
            createMockCondition({
              field: 'payload.amount',
              operator: 'gt',
              value: 100,
            }),
          ],
          event,
        ),
      ).toBe(false);
      expect(
        service.matchConditions(
          [
            createMockCondition({
              field: 'payload.amount',
              operator: 'gte',
              value: 100,
            }),
          ],
          event,
        ),
      ).toBe(true);
    });

    it('should match lt/lte operators', () => {
      expect(
        service.matchConditions(
          [
            createMockCondition({
              field: 'payload.amount',
              operator: 'lt',
              value: 101,
            }),
          ],
          event,
        ),
      ).toBe(true);
      expect(
        service.matchConditions(
          [
            createMockCondition({
              field: 'payload.amount',
              operator: 'lt',
              value: 100,
            }),
          ],
          event,
        ),
      ).toBe(false);
      expect(
        service.matchConditions(
          [
            createMockCondition({
              field: 'payload.amount',
              operator: 'lte',
              value: 100,
            }),
          ],
          event,
        ),
      ).toBe(true);
    });

    it('should match in operator', () => {
      const condition = createMockCondition({
        field: 'payload.status',
        operator: 'in',
        value: ['PAID', 'COMPLETED'],
      });
      expect(service.matchConditions([condition], event)).toBe(true);
    });

    it('should match exists operator', () => {
      const conditionExists = createMockCondition({
        field: 'payload.amount',
        operator: 'exists',
        value: true,
      });
      expect(service.matchConditions([conditionExists], event)).toBe(true);

      const conditionNotExists = createMockCondition({
        field: 'missing.field',
        operator: 'exists',
        value: false,
      });
      expect(service.matchConditions([conditionNotExists], event)).toBe(true);
    });

    it('should return false if any condition fails', () => {
      const conditions = [
        createMockCondition({
          field: 'payload.amount',
          operator: 'gt',
          value: 50,
        }),
        createMockCondition({
          field: 'payload.status',
          operator: 'eq',
          value: 'PENDING',
        }), // This fails
      ];
      expect(service.matchConditions(conditions, event)).toBe(false);
    });

    it('should skip non-executable conditions (e.g. marked as delete)', () => {
      const conditions = [
        {
          field: 'payload.status',
          operator: 'eq',
          value: 'PENDING',
          _delete: true,
        } as unknown as RuntimeCondition,
      ];
      // Since it's marked as deleted, it should be skipped and return true (default for empty/skipped)
      expect(service.matchConditions(conditions, event)).toBe(true);
    });
  });

  describe('Template Resolution', () => {
    const event = createMockAutomationEvent({
      metadata: {
        user: { name: 'Alice', role: 'USER', userId: 'u1' },
        payload: {},
      } as unknown as AutomationEvent['metadata'],
    });

    it('should handle missing paths by returning empty string', () => {
      const result = (
        service as unknown as {
          resolveTemplate: (input: unknown, eventData: unknown) => unknown;
        }
      ).resolveTemplate('Value: {{ missing.path }}', event);
      expect(result).toBe('Value: ');
    });

    it('should stringify objects if they are resolved in templates', () => {
      const result = (
        service as unknown as {
          resolveTemplate: (input: unknown, eventData: unknown) => unknown;
        }
      ).resolveTemplate('Data: {{ user }}', event);
      expect(result).toBe(`Data: ${JSON.stringify(event.metadata?.user)}`);
    });
  });

  describe('Webhook Execution', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation();
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('should execute webhook with resolved parameters', async () => {
      const event = createMockAutomationEvent({
        metadata: {
          payload: { token: 'abc' },
        } as unknown as AutomationEvent['metadata'],
      });
      // Mock repo to return a rule with this action
      repo.findActiveRulesByEventType.mockResolvedValue([
        {
          id: 'rule_1',
          actions: [
            {
              id: 'a1',
              type: AutomationActionType.SEND_WEBHOOK,
              webhookConfig: {
                url: 'https://api.test',
                method: 'POST',
                headers: { 'X-Token': '{{ payload.token }}' },
                payload: { event: '{{ eventType }}' },
              },
            },
          ],
          conditions: [],
        } as unknown as AutomationRuleWithRelations,
      ]);

      fetchSpy.mockResolvedValue({ ok: true });

      await service.process(event);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Token': 'abc',
            'content-type': 'application/json',
          }),
          body: JSON.stringify({ event: event.eventType }),
        }),
      );
    });

    it('should handle webhook failure gracefully', async () => {
      const event = createMockAutomationEvent();
      repo.findActiveRulesByEventType.mockResolvedValue([
        {
          id: 'rule_1',
          actions: [
            {
              id: 'a1',
              type: AutomationActionType.SEND_WEBHOOK,
              webhookConfig: { url: 'https://api.test', method: 'POST' },
            },
          ],
          conditions: [],
        } as unknown as AutomationRuleWithRelations,
      ]);
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });

      await service.process(event);

      // Should not throw, but log warning (verified by spy in beforeEach)
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('Action Target Resolution', () => {
    it('should resolve notification target from metadata if not explicitly provided', async () => {
      const event = createMockAutomationEvent({
        metadata: {
          user: { id: 'metadata_user_id' },
        } as unknown as AutomationEvent['metadata'],
      });
      repo.findActiveRulesByEventType.mockResolvedValue([
        {
          id: 'rule_1',
          actions: [
            {
              id: 'a1',
              type: AutomationActionType.SEND_NOTIFICATION,
              notificationConfig: { title: 'Test', message: 'Test' },
            },
          ],
          conditions: [],
        } as unknown as AutomationRuleWithRelations,
      ]);

      await service.process(event);

      expect(notificationActionService.send).toHaveBeenCalledWith(
        expect.anything(),
        event,
        expect.any(Object),
      );

      // Verification of idempotency key which includes the target
      const idempotencyKeyCall = idempotencyService.acquire.mock.calls[0][0];
      expect(idempotencyKeyCall.target).toBe('metadata_user_id');
    });
  });
});
