import { Module } from '@nestjs/common';
import { NotificationLogService } from './notification-log.service';
import { NotificationLogController } from './notification-log.controller';
import { NotificationLogRepository } from './notification-log.repository';

@Module({
  imports: [],
  controllers: [NotificationLogController],
  providers: [NotificationLogService, NotificationLogRepository],
  exports: [NotificationLogService, NotificationLogRepository],
})
export class NotificationLogModule {}
