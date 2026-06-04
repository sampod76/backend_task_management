import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { OffsetPagination } from '../../../common/pagination/pagination.types';
import { EventType } from '../../audit-log/constants/audit-log.enum';
import { automationRuleRelationsInclude } from '../mappers/automation-rule.mapper';
import type { AutomationRuleWithRelations } from '../mappers/automation-rule.mapper';

/**
 * Prisma data access boundary for automation rules.
 *
 * Contract:
 * - All public reads exclude soft-deleted rules.
 * - Engine-facing reads must include conditions and action config relations.
 * - Soft delete cascades are implemented manually across child tables so
 *   historical rows remain queryable for debugging.
 *
 * Warning:
 * The Prisma soft-delete extension does not cover AutomationRule models. Keep
 * deletedAt filters in this repository whenever adding new read methods.
 *
 * @see automationRuleRelationsInclude
 * @see prisma/automation-rule.prisma
 */
@Injectable()
export class RuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(args: Prisma.AutomationRuleCreateArgs) {
    return this.prisma.client.automationRule.create(args);
  }

  findById(
    id: string,
    args?: Omit<Prisma.AutomationRuleFindFirstArgs, 'where'>,
  ) {
    return this.prisma.client.automationRule.findFirst({
      ...args,
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  findByIdWithRelations(
    id: string,
  ): Promise<AutomationRuleWithRelations | null> {
    return this.prisma.client.automationRule.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: automationRuleRelationsInclude,
    });
  }

  findMany(
    args: Prisma.AutomationRuleFindManyArgs,
    pagination?: OffsetPagination,
  ) {
    return this.prisma.client.automationRule.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
      ...(pagination
        ? {
            skip: pagination.skip,
            take: pagination.limit,
          }
        : {}),
      orderBy:
        args.orderBy ??
        (pagination
          ? {
              [pagination.sortBy]: pagination.sortOrder,
            }
          : undefined),
    });
  }

  findManyWithRelations(
    args: Omit<Prisma.AutomationRuleFindManyArgs, 'include'>,
    pagination?: OffsetPagination,
  ): Promise<AutomationRuleWithRelations[]> {
    return this.prisma.client.automationRule.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
      ...(pagination
        ? {
            skip: pagination.skip,
            take: pagination.limit,
          }
        : {}),
      orderBy:
        args.orderBy ??
        (pagination
          ? {
              [pagination.sortBy]: pagination.sortOrder,
            }
          : undefined),
      include: automationRuleRelationsInclude,
    });
  }

  findOne(args: Prisma.AutomationRuleFindFirstArgs) {
    return this.prisma.client.automationRule.findFirst({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  count(args?: Prisma.AutomationRuleCountArgs) {
    return this.prisma.client.automationRule.count({
      ...args,
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  update(args: Prisma.AutomationRuleUpdateArgs) {
    return this.prisma.client.automationRule.update({
      ...args,
      where: {
        id: args.where.id,
        deletedAt: null,
      },
    });
  }

  async softDelete(id: string): Promise<Prisma.BatchPayload> {
    /**
     * Transaction-sensitive soft delete:
     * parent rule, conditions, actions, and action-specific config rows all get
     * the same deletedAt timestamp. This avoids engine reads seeing a deleted
     * parent with still-active action configs.
     */
    const actionRows = await this.prisma.client.automationRuleAction.findMany({
      where: {
        ruleId: id,
      },
      select: {
        id: true,
      },
    });

    const actionIds = actionRows.map(({ id }) => id);
    const deletedAt = new Date();

    const conditionUpdate =
      this.prisma.client.automationRuleCondition.updateMany({
        where: {
          ruleId: id,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      });

    const actionUpdate = this.prisma.client.automationRuleAction.updateMany({
      where: {
        ruleId: id,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });

    const ruleUpdate = this.prisma.client.automationRule.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });

    if (actionIds.length === 0) {
      const [, , result] = await this.prisma.client.$transaction([
        conditionUpdate,
        actionUpdate,
        ruleUpdate,
      ]);

      return result;
    }

    const [, , , , , result] = await this.prisma.client.$transaction([
      conditionUpdate,
      actionUpdate,
      this.prisma.client.automationRuleEmailAction.updateMany({
        where: {
          actionId: {
            in: actionIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      }),
      this.prisma.client.automationRuleNotificationAction.updateMany({
        where: {
          actionId: {
            in: actionIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      }),
      this.prisma.client.automationRuleWebhookAction.updateMany({
        where: {
          actionId: {
            in: actionIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      }),
      ruleUpdate,
    ]);

    return result;
  }

  findActiveRulesByEventType(
    eventType: keyof typeof EventType,
    serviceName?: string,
  ): Promise<AutomationRuleWithRelations[]> {
    /**
     * Rule engine entry query. It returns active rules in priority order with
     * all child config rows needed by mapRuleRowsToRuntimeRule().
     *
     * Warning:
     * Changing this include or ordering changes runtime execution behavior.
     */
    return this.prisma.client.automationRule.findMany({
      where: {
        eventType,
        isActive: true,
        deletedAt: null,
        ...(serviceName
          ? {
              serviceName,
            }
          : {}),
      },
      orderBy: {
        priority: 'asc',
      },
      include: automationRuleRelationsInclude,
    });
  }

  findActiveByEvent(
    eventType: keyof typeof EventType,
    args?: Omit<Prisma.AutomationRuleFindManyArgs, 'where'>,
  ): Promise<AutomationRuleWithRelations[]> {
    return this.prisma.client.automationRule.findMany({
      ...args,
      where: {
        eventType,
        isActive: true,
        deletedAt: null,
      },
      orderBy: args?.orderBy ?? {
        priority: 'asc',
      },
      include: automationRuleRelationsInclude,
    });
  }
}
