import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogRepository } from './audit-log.repository';

@Module({
  imports: [],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogRepository],
  exports: [AuditLogService, AuditLogRepository],
})
export class AuditLogModule {}
