import { Module } from '@nestjs/common';
import { AutomationCoreModule } from './automation-core.module';
import { AutomationWorkerRunner } from './processors/automation-worker.runner';

@Module({
  imports: [AutomationCoreModule],
  providers: [AutomationWorkerRunner],
})
export class AutomationWorkerModule {}
