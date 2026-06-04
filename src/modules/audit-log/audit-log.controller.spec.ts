import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuthPayload } from '../auth/auth.types';
import { ServiceName } from '../../common/constants/automation';

describe('AuditLogController', () => {
  let controller: AuditLogController;

  const mockAuditLogService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks(); // 🔥 reset

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService, // ✅ mock service
        },
      ],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // 🔥 CREATE

  // 🔥 FIND ALL
  it('should call service.findAll', async () => {
    mockAuditLogService.findAll.mockResolvedValue([]);

    const result = await controller.findAll(
      {
        page: 1,
        limit: 10,
        sortOrder: 'asc',
      },
      { userId: '1122' } as AuthPayload,
    );

    expect(mockAuditLogService.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  // 🔥 FIND ONE
  it('should call service.findOne with id', async () => {
    mockAuditLogService.findOne.mockResolvedValue({ id: '1' });

    const result = await controller.findOne('1', ServiceName.FLYGHOR_AUTH, {
      userId: '1122',
    } as AuthPayload);

    expect(mockAuditLogService.findOne).toHaveBeenCalledWith(
      '1',
      'FLYGHOR_AUTH',
      {
        userId: '1122',
      },
    );
    expect(result).toEqual({ id: '1' });
  });
});
