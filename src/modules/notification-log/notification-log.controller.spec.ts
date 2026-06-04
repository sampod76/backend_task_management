import { Test, TestingModule } from '@nestjs/testing';
import { NotificationLogController } from './notification-log.controller';
import { NotificationLogService } from './notification-log.service';
import { AuthPayload } from '../auth/auth.types';
import { ServiceName } from '../../common/constants/automation';

describe('NotificationLogController', () => {
  let controller: NotificationLogController;

  const mockNotificationLogService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationLogController],
      providers: [
        {
          provide: NotificationLogService,
          useValue: mockNotificationLogService,
        },
      ],
    }).compile();

    controller = module.get<NotificationLogController>(
      NotificationLogController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.findAll', async () => {
    mockNotificationLogService.findAll.mockResolvedValue([]);

    const result = await controller.findAll(
      {
        page: 1,
        limit: 10,
        sortOrder: 'asc',
      },
      { userId: '1122' } as AuthPayload,
    );

    expect(mockNotificationLogService.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should call service.findOne with id and serviceName', async () => {
    mockNotificationLogService.findOne.mockResolvedValue({ id: '1' });

    const result = await controller.findOne('1', ServiceName.FLYGHOR_AUTH, {
      userId: '1122',
    } as AuthPayload);

    expect(mockNotificationLogService.findOne).toHaveBeenCalledWith(
      '1',
      'FLYGHOR_AUTH',
      {
        userId: '1122',
      },
    );
    expect(result).toEqual({ id: '1' });
  });

  it('should call service.markAsRead', async () => {
    mockNotificationLogService.markAsRead.mockResolvedValue({
      id: '1',
      isRead: true,
    });

    const result = await controller.markAsRead('1', ServiceName.FLYGHOR_AUTH, {
      userId: '1122',
    } as AuthPayload);

    expect(mockNotificationLogService.markAsRead).toHaveBeenCalledWith(
      '1',
      'FLYGHOR_AUTH',
      {
        userId: '1122',
      },
    );
    expect(result).toEqual({ id: '1', isRead: true });
  });
});
