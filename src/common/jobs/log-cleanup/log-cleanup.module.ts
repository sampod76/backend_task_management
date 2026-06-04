import { Module } from '@nestjs/common';

import { LogCleanupService } from './log-cleanup.service';

@Module({
  providers: [LogCleanupService],
})
export class LogCleanupModule {}
