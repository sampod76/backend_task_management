import { Test, TestingModule } from '@nestjs/testing';
import { RuleController } from '../controllers/rule.controller';
import { RuleService } from '../services/rule.service';
import { createMockRuleRow } from './utils/rule-test.fixtures';

describe('RuleController', () => {
  let controller: RuleController;
  let service: Pick<jest.Mocked<RuleService>, 'findAll' | 'findOne' | 'create' | 'update' | 'remove'>;

  const auth = {
    userId: 'u1',
    email: 'admin@example.com',
    role: 'ADMIN',
  } as any;

  beforeEach(async () => {
    const mockRuleService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RuleController],
      providers: [
        {
          provide: RuleService,
          useValue: mockRuleService,
        },
      ],
    }).compile();

    controller = module.get<RuleController>(RuleController);
    service = module.get(RuleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('should return paginated rules', async () => {
      const rules = [createMockRuleRow()];
      service.findAll.mockResolvedValue({
        items: rules as any,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false },
      });

      const result = await controller.findAll({ page: 1, limit: 10 } as any, auth);

      expect(result.items).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 }, auth);
    });
  });

  describe('create()', () => {
    it('should create a new rule', async () => {
      const dto = { name: 'New Rule', eventType: 'USER_CREATED' as any };
      service.create.mockResolvedValue(createMockRuleRow(dto));

      const result = await controller.create(dto as any, auth);

      expect(result.name).toBe('New Rule');
      expect(service.create).toHaveBeenCalledWith(dto, auth);
    });
  });

  describe('update()', () => {
    it('should update an existing rule', async () => {
      const dto = { name: 'Updated Name' };
      service.update.mockResolvedValue(createMockRuleRow(dto));

      const result = await controller.update('rule_1', dto, auth);

      expect(result.name).toBe('Updated Name');
      expect(service.update).toHaveBeenCalledWith('rule_1', dto, auth);
    });
  });

  describe('remove()', () => {
    it('should soft delete a rule', async () => {
      service.remove.mockResolvedValue({ success: true });

      await controller.remove('rule_1', auth);

      expect(service.remove).toHaveBeenCalledWith('rule_1', auth);
    });
  });
});
