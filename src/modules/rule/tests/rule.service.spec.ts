import { Test, TestingModule } from '@nestjs/testing';
import { RuleService } from '../services/rule.service';
import { RuleRepository } from '../repositories/rule.repository';
import { RuleConditionService } from '../services/rule-condition.service';
import { RuleActionService } from '../services/rule-action.service';
import { AutomationActionType } from '../../automation/constants/automation-constants';
import type { AuthPayload } from '../../auth/auth.types';
import { AppException } from '../../../common/errors';
import { UpdateAutomationRuleInput } from '../schemas/create-rule.schema';
import { createMockRuleRow } from './utils/rule-test.fixtures';

describe('RuleService', () => {
  let service: RuleService;
  let repo: Pick<jest.Mocked<RuleRepository>, 'create' | 'findManyWithRelations' | 'count' | 'findByIdWithRelations' | 'update' | 'softDelete'>;
  let conditionService: Pick<jest.Mocked<RuleConditionService>, 'applyOperations'>;
  let actionService: Pick<jest.Mocked<RuleActionService>, 'applyOperations'>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      count: jest.fn(),
      findByIdWithRelations: jest.fn(),
      findManyWithRelations: jest.fn().mockResolvedValue([]),
    };

    const mockConditionService = {
      applyOperations: jest.fn(),
    };

    const mockActionService = {
      applyOperations: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleService,
        { provide: RuleRepository, useValue: mockRepo },
        { provide: RuleConditionService, useValue: mockConditionService },
        { provide: RuleActionService, useValue: mockActionService },
      ],
    }).compile();

    service = module.get<RuleService>(RuleService);
    repo = module.get(RuleRepository);
    conditionService = module.get(RuleConditionService);
    actionService = module.get(RuleActionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update()', () => {
    const ruleId = 'rule_1';
    const auth = { userId: 'u1' } as AuthPayload;

    it('should update rule and delegate sub-operations', async () => {
      const existingRule = createMockRuleRow({ id: ruleId });
      repo.findByIdWithRelations.mockResolvedValue(existingRule);

      const updateData: UpdateAutomationRuleInput = {
        name: 'Updated Rule',
        conditions: [{ field: 'user.role', operator: 'eq', value: 'ADMIN' }],
        actions: [{ type: AutomationActionType.SEND_EMAIL, to: 'a@b.c', subject: 'S', body: 'B' }],
      };

      await service.update(ruleId, updateData, auth);

      expect(repo.update).toHaveBeenCalledWith({
        where: { id: ruleId },
        data: expect.objectContaining({ name: 'Updated Rule' }),
      });
      expect(conditionService.applyOperations).toHaveBeenCalledWith(ruleId, updateData.conditions);
      expect(actionService.applyOperations).toHaveBeenCalledWith(ruleId, updateData.actions);
    });

    it('should throw error if rule not found', async () => {
      repo.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.update(ruleId, {}, auth)).rejects.toThrow('Rule not found');
    });

    it('should detect duplicate rules after simulation', async () => {
      const existingRule = createMockRuleRow({ 
        id: ruleId, 
        eventType: 'USER_CREATED',
        conditions: [{ id: 'cond_1', fieldPath: 'user.role', conditionType: 'OPERATOR', operator: 'EQ', valueType: 'STRING', stringValue: 'USER' }] 
      });
      repo.findByIdWithRelations.mockResolvedValue(existingRule);

      // Another rule exists with the same conditions we want to set
      const anotherRule = createMockRuleRow({ 
        id: 'rule_2', 
        conditions: [{ id: 'cond_2', fieldPath: 'user.role', conditionType: 'OPERATOR', operator: 'EQ', valueType: 'STRING', stringValue: 'ADMIN' }] 
      });
      repo.findManyWithRelations.mockResolvedValue([anotherRule]);

      const updateData: UpdateAutomationRuleInput = {
        conditions: [{ id: 'cond_1', field: 'user.role', operator: 'eq', value: 'ADMIN' }],
      };

      await expect(service.update(ruleId, updateData, auth)).rejects.toThrow(AppException);
    });
  });

  describe('remove()', () => {
    const auth = { userId: 'u1' } as any;
    it('should soft delete the rule', async () => {
      const ruleId = 'rule_1';
      repo.softDelete.mockResolvedValue({ count: 1 });
      await service.remove(ruleId, auth);
      expect(repo.softDelete).toHaveBeenCalledWith(ruleId);
    });
  });
});
