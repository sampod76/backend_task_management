import { Test, TestingModule } from '@nestjs/testing';
import { RuleActionService } from '../services/rule-action.service';
import { RuleActionRepository } from '../repositories/rule-action.repository';
import { AutomationActionType } from '../../automation/constants/automation-constants';
import { createMockActionRow } from './utils/rule-test.fixtures';

describe('RuleActionService', () => {
  let service: RuleActionService;
  let repo: Pick<
    jest.Mocked<RuleActionRepository>,
    | 'create'
    | 'updateEmailConfig'
    | 'updateNotificationConfig'
    | 'updateWebhookConfig'
    | 'softDelete'
    | 'findActiveByRuleId'
  >;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      updateEmailConfig: jest.fn(),
      updateNotificationConfig: jest.fn(),
      updateWebhookConfig: jest.fn(),
      softDelete: jest.fn(),
      findActiveByRuleId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleActionService,
        {
          provide: RuleActionRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<RuleActionService>(RuleActionService);
    repo = module.get(RuleActionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applyOperations()', () => {
    const ruleId = 'rule_123';

    it('should create a new email action', async () => {
      const operation = {
        type: AutomationActionType.SEND_EMAIL,
        to: 'test@example.com',
        subject: 'Welcome',
        body: 'Hello World',
        isActive: true,
      } as any;

      await service.applyOperations(ruleId, [operation]);

      expect(repo.create).toHaveBeenCalledWith(
        ruleId,
        expect.objectContaining({
          type: AutomationActionType.SEND_EMAIL,
          emailConfig: {
            create: expect.objectContaining({
              to: 'test@example.com',
              subject: 'Welcome',
            }),
          },
        }),
      );
    });

    it('should create a new notification action', async () => {
      const operation = {
        type: AutomationActionType.SEND_NOTIFICATION,
        title: 'New Alert',
        message: 'Something happened',
        userId: 'user_1',
        isActive: true,
      } as any;

      await service.applyOperations(ruleId, [operation]);

      expect(repo.create).toHaveBeenCalledWith(
        ruleId,
        expect.objectContaining({
          type: AutomationActionType.SEND_NOTIFICATION,
          notificationConfig: {
            create: expect.objectContaining({
              title: 'New Alert',
            }),
          },
        }),
      );
    });

    it('should update an existing action config', async () => {
      const actionId = 'action_1';
      const operation = {
        id: actionId,
        type: AutomationActionType.SEND_EMAIL,
        subject: 'Updated Subject',
      };

      repo.findActiveByRuleId.mockResolvedValue(
        createMockActionRow({ id: actionId }),
      );

      await service.applyOperations(ruleId, [operation]);

      expect(repo.updateEmailConfig).toHaveBeenCalledWith(actionId, {
        subject: 'Updated Subject',
      });
    });

    it('should soft delete an action when _delete is true', async () => {
      const actionId = 'action_1';
      const operation = {
        id: actionId,
        _delete: true,
      };

      await service.applyOperations(ruleId, [operation]);

      expect(repo.softDelete).toHaveBeenCalledWith(ruleId, actionId);
    });

    it('should throw error if trying to update non-existent action', async () => {
      const operation = {
        id: 'non_existent',
        type: AutomationActionType.SEND_EMAIL,
        subject: 'Fail',
      };

      repo.findActiveByRuleId.mockResolvedValue(null);

      await expect(
        service.applyOperations(ruleId, [operation]),
      ).rejects.toThrow('Action non_existent not found');
    });
  });
});
