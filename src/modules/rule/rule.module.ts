import { Module } from '@nestjs/common';
import { RuleService } from './services/rule.service';
import { RuleController } from './controllers/rule.controller';
import { RuleRepository } from './repositories/rule.repository';
import { RuleConditionRepository } from './repositories/rule-condition.repository';
import { RuleConditionService } from './services/rule-condition.service';
import { RuleActionRepository } from './repositories/rule-action.repository';
import { RuleActionService } from './services/rule-action.service';
import { PrismaModule } from '../../database/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [RuleController],
  providers: [
    RuleService,
    RuleRepository,
    RuleConditionRepository,
    RuleConditionService,
    RuleActionRepository,
    RuleActionService,
  ],
  exports: [
    RuleService,
    RuleRepository,
    RuleConditionService,
    RuleActionService,
  ],
})
export class RuleModule {}
