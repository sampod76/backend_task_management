import { Test, TestingModule } from '@nestjs/testing';
import { RuleConditionService } from '../services/rule-condition.service';
import { RuleConditionRepository } from '../repositories/rule-condition.repository';
import { createMockConditionRow } from './utils/rule-test.fixtures';

describe('RuleConditionService', () => {
  let service: RuleConditionService;
  let repo: Pick<jest.Mocked<RuleConditionRepository>, 'create' | 'update' | 'softDelete' | 'findById'>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleConditionService,
        {
          provide: RuleConditionRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<RuleConditionService>(RuleConditionService);
    repo = module.get(RuleConditionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applyOperations()', () => {
    const ruleId = 'rule_123';

    it('should create a new condition from operation', async () => {
      const operation = {
        field: 'user.email',
        operator: 'eq' as const,
        value: 'test@example.com',
      };

      await service.applyOperations(ruleId, [operation]);

      expect(repo.create).toHaveBeenCalledWith(
        ruleId,
        expect.objectContaining({
          fieldPath: 'user.email',
          operator: 'EQ',
          stringValue: 'test@example.com',
          sortOrder: 0,
        }),
      );
    });

    it('should update an existing condition', async () => {
      const conditionId = 'cond_1';
      const operation = {
        id: conditionId,
        field: 'user.name',
        operator: 'neq' as const,
        value: 'Admin',
      };

      repo.findById.mockResolvedValue(createMockConditionRow({ id: conditionId }));

      await service.applyOperations(ruleId, [operation]);

      expect(repo.update).toHaveBeenCalledWith(
        ruleId,
        conditionId,
        expect.objectContaining({
          fieldPath: 'user.name',
          operator: 'NEQ',
          stringValue: 'Admin',
        }),
      );
    });

    it('should soft delete a condition when _delete is true', async () => {
      const conditionId = 'cond_1';
      const operation = {
        id: conditionId,
        _delete: true,
      } as any;

      await service.applyOperations(ruleId, [operation]);

      expect(repo.softDelete).toHaveBeenCalledWith(ruleId, conditionId);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should handle isDelete true for backward compatibility', async () => {
      const conditionId = 'cond_1';
      const operation = {
        id: conditionId,
        isDelete: true,
      } as any;

      await service.applyOperations(ruleId, [operation]);

      expect(repo.softDelete).toHaveBeenCalledWith(ruleId, conditionId);
    });

    it('should handle multiple operations in order', async () => {
      const operations = [
        { field: 'f1', operator: 'eq' as const, value: 'v1' },
        { field: 'f2', operator: 'eq' as const, value: 'v2' },
      ];

      await service.applyOperations(ruleId, operations);

      expect(repo.create).toHaveBeenCalledTimes(2);
      expect(repo.create).toHaveBeenNthCalledWith(1, ruleId, expect.objectContaining({ fieldPath: 'f1', sortOrder: 0 }));
      expect(repo.create).toHaveBeenNthCalledWith(2, ruleId, expect.objectContaining({ fieldPath: 'f2', sortOrder: 1 }));
    });
  });
});
