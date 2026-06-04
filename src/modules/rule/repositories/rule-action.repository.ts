import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RuleActionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByRuleId(ruleId: string, actionId: string) {
    return this.prisma.client.automationRuleAction.findFirst({
      where: {
        id: actionId,
        ruleId,
        deletedAt: null,
        isActive: true,
      },
    });
  }

  findActiveNotificationConfig(actionId: string) {
    return this.prisma.client.automationRuleNotificationAction.findFirst({
      where: {
        actionId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        eventName: true,
        pushChannel: true,
      },
    });
  }

  create(
    ruleId: string,
    data: Prisma.AutomationRuleActionCreateWithoutRuleInput,
  ) {
    return this.prisma.client.automationRuleAction.create({
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

  updateEmailConfig(
    actionId: string,
    data: Prisma.AutomationRuleEmailActionUpdateInput,
  ) {
    return this.prisma.client.automationRuleEmailAction.update({
      where: {
        actionId,
      },
      data,
    });
  }

  updateNotificationConfig(
    actionId: string,
    data: Prisma.AutomationRuleNotificationActionUpdateInput,
  ) {
    return this.prisma.client.automationRuleNotificationAction.update({
      where: {
        actionId,
      },
      data,
    });
  }

  updateWebhookConfig(
    actionId: string,
    data: Prisma.AutomationRuleWebhookActionUpdateInput,
  ) {
    return this.prisma.client.automationRuleWebhookAction.update({
      where: {
        actionId,
      },
      data,
    });
  }

  async softDelete(
    ruleId: string,
    actionId: string,
  ): Promise<Prisma.BatchPayload> {
    const deletedAt = new Date();
    const [, , , result] = await this.prisma.client.$transaction([
      this.prisma.client.automationRuleEmailAction.updateMany({
        where: {
          actionId,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      }),
      this.prisma.client.automationRuleNotificationAction.updateMany({
        where: {
          actionId,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      }),
      this.prisma.client.automationRuleWebhookAction.updateMany({
        where: {
          actionId,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      }),
      this.prisma.client.automationRuleAction.updateMany({
        where: {
          id: actionId,
          ruleId,
          deletedAt: null,
        },
        data: {
          deletedAt,
          isActive: false,
        },
      }),
    ]);

    return result;
  }
}
