import { Injectable, Logger } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { subMonths } from 'date-fns';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class LogCleanupService {
  private readonly logger = new Logger(LogCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldLogs(): Promise<void> {
    this.logger.log('Starting log cleanup...');

    const cutoffDate = subMonths(new Date(), 3);

    const [auditLogs, emailLogs, notificationLogs, automationJobLogs] =
      await Promise.all([
        this.prisma.client.auditLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),

        this.prisma.client.emailLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),

        this.prisma.client.notificationLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),

        this.prisma.client.automationJobLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
      ]);

    this.logger.log(`
Cleanup completed:

Audit Logs Deleted: ${auditLogs.count}
Email Logs Deleted: ${emailLogs.count}
Notification Logs Deleted: ${notificationLogs.count}
Automation Job Logs Deleted: ${automationJobLogs.count}
`);
  }
}
