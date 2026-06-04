import { Module } from '@nestjs/common';
import { AutomationQueueProducer } from './services/automation-queue.producer';
import { AutomationDebugController } from './automation-debug.controller';

import { BullMqModule } from '../../common/lib/queue/bullmq.module';
import { AutomationCoreModule } from './automation-core.module';

@Module({
  imports: [BullMqModule, AutomationCoreModule],
  controllers: [AutomationDebugController],
  providers: [AutomationQueueProducer],
  exports: [AutomationCoreModule, AutomationQueueProducer],
})
export class AutomationModule {}
