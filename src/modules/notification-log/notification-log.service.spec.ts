import { Test, TestingModule } from '@nestjs/testing';
import { NotificationLogService } from './notification-log.service';
import { NotificationLogRepository } from './notification-log.repository';

describe('NotificationLogService', () => {
  let service: NotificationLogService;

  const mockNotificationLogRepository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationLogService,
        {
          provide: NotificationLogRepository,
          useValue: mockNotificationLogRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationLogService>(NotificationLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
