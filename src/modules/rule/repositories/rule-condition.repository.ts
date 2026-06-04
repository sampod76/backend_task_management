import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RuleConditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(ruleId: string, conditionId: string) {
    return this.prisma.client.automationRuleCondition.findFirst({
      where: {
        id: conditionId,
        ruleId,
        deletedAt: null,
      },
    });
  }

  findByRuleId(ruleId: string) {
    return this.prisma.client.automationRuleCondition.findMany({
      where: {
        ruleId,
        deletedAt: null,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  create(
    ruleId: string,
    data: Prisma.AutomationRuleConditionCreateWithoutRuleInput,
  ) {
    return this.prisma.client.automationRuleCondition.create({
      data: {
        ...data,
        rule: {
          connect: {
            id: ruleId,
          },
        },
      },
    });
  }

  update(
    ruleId: string,
    conditionId: string,
    data: Prisma.AutomationRuleConditionUpdateInput,
  ) {
    return this.prisma.client.automationRuleCondition.updateMany({
      where: {
        id: conditionId,
        ruleId,
        deletedAt: null,
      },
      data,
    });
  }

  softDelete(ruleId: string, conditionId: string) {
    return this.prisma.client.automationRuleCondition.updateMany({
      where: {
        id: conditionId,
        ruleId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
