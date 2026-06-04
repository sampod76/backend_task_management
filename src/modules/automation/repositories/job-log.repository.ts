import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class JobLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(data: Prisma.AutomationJobLogUpsertArgs) {
    return this.prisma.client.automationJobLog.upsert(data);
  }

  update(data: Prisma.AutomationJobLogUpdateArgs) {
    return this.prisma.client.automationJobLog.update(data);
  }
}
