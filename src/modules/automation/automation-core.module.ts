import { Module } from '@nestjs/common';
import { EmailModule } from '../../common/lib/email/email.module';
import { BullMqModule } from '../../common/lib/queue/bullmq.module';
import { PusherModule } from '../../common/lib/pusher/pusher.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RuleModule } from '../rule/rule.module';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { JobLogRepository } from './repositories/job-log.repository';
import { AutomationProcessor } from './processors/automation.processor';
import { AuditLogAutoMationService } from './services/audit-log-auto.service';
import { AutomationDlqService } from './services/automation-dlq.service';
import { EmailActionService } from './services/email-action.service';
import { IdempotencyService } from './services/idempotency.service';
import { JobLogService } from './services/job-log.service';
import { NotificationActionService } from './services/notification-action.service';
import { RuleEngineService } from './services/rule-engine.service';

@Module({
  imports: [BullMqModule, EmailModule, PusherModule, RuleModule, AuditLogModule],
  providers: [
    AutomationProcessor,
    AuditLogAutoMationService,
    JobLogService,
    RuleEngineService,
    EmailActionService,
    NotificationActionService,
    IdempotencyService,
    AutomationDlqService,
    AuditLogRepository,
    JobLogRepository,
  ],
  exports: [
    AutomationProcessor,
    AuditLogAutoMationService,
    JobLogService,
    RuleEngineService,
    EmailActionService,
    NotificationActionService,
    IdempotencyService,
    AutomationDlqService,
  ],
})
export class AutomationCoreModule {}
