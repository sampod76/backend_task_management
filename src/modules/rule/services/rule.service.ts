import { Injectable } from '@nestjs/common';
import stringify from 'fast-json-stable-stringify';
import { AppException } from '../../../common/errors';
import {
  buildOffsetMeta,
  buildOffsetPagination,
} from '../../../common/pagination/offset-pagination';
import { Prisma } from '../../../generated/prisma/client';
import { AuthPayload } from '../../auth/auth.types';
import {
  RULE_SEARCHABLE_FIELDS,
  RULE_SORTABLE_FIELDS,
} from '../constants/rule.constants';
import {
  mapActionsInputToCreateRows,
  mapConditionRowsToRuntimeConditions,
  mapConditionsInputToCreateRows,
  mapRuleRowsToRuntimeRule,
  RuntimeConditions,
  isDeleteCondition,
  AutomationRuleWithRelations,
  RuntimeCondition,
} from '../mappers/automation-rule.mapper';
import { RuleRepository } from '../repositories/rule.repository';
import { RuleConditionService } from './rule-condition.service';
import { RuleActionService } from './rule-action.service';
import {
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from '../schemas/create-rule.schema';
import { RuleQueryFilter } from '../schemas/rule.filter.schema';

/**
 * Application service for rule lifecycle operations.
 *
 * Responsibilities:
 * - enforce duplicate-rule semantics before writes
 * - coordinate parent AutomationRule writes with condition/action child services
 * - return the runtime/public rule shape via mapper functions
 *
 * Flow:
 * RuleController
 * -> RuleService
 * -> RuleRepository + RuleConditionService + RuleActionService
 * -> automation-rule.mapper.ts
 * -> Prisma automation schema
 *
 * Warning:
 * Duplicate checks are application-level checks, not database constraints. Two
 * concurrent create/update requests with equivalent normalized conditions can
 * race unless a future transaction/advisory lock is added.
 *
 * @see src/modules/rule/repositories/rule.repository.ts
 * @see src/modules/rule/services/rule-action.service.ts
 * @see src/modules/rule/services/rule-condition.service.ts
 */
@Injectable()
export class RuleService {
  constructor(
    private readonly repo: RuleRepository,
    private readonly conditionService: RuleConditionService,
    private readonly actionService: RuleActionService,
  ) {}

  private checkAccess(_user: AuthPayload) {
    // Access is currently enforced by controller guards.
  }

  async create(data: CreateAutomationRuleInput, user: AuthPayload) {
    this.checkAccess(user);

    await this.checkDuplicate(
      {
        serviceName: data.serviceName,
        eventType: data.eventType,
      },
      data.conditions,
    );

    const created = await this.repo.create({
      data: {
        name: data.name,
        serviceName: data.serviceName,
        eventType: data.eventType,
        isActive: data.isActive,
        priority: data.priority,
        description: data.description,

        conditions: {
          create: mapConditionsInputToCreateRows(data.conditions),
        },

        actions: {
          create: mapActionsInputToCreateRows(data.actions),
        },
      },
      select: {
        id: true,
      },
    });

    const rule = await this.repo.findByIdWithRelations(created.id);

    if (!rule) {
      throw AppException.internal('Failed to load created rule');
    }

    return mapRuleRowsToRuntimeRule(rule);
  }

  async findAll(query: RuleQueryFilter, user: AuthPayload) {
    this.checkAccess(user);

    const pagination = buildOffsetPagination(query, RULE_SORTABLE_FIELDS);
    const where = this.buildWhereFilter(query);

    const [rules, count] = await Promise.all([
      this.repo.findManyWithRelations({ where }, pagination),
      this.repo.count({ where }),
    ]);

    return {
      meta: buildOffsetMeta(count, pagination.page, pagination.limit),
      items: rules.map((rule) => mapRuleRowsToRuntimeRule(rule)),
    };
  }

  async findOne(query: RuleQueryFilter, user: AuthPayload) {
    this.checkAccess(user);

    const where = this.buildWhereFilter(query);

    const rules = await this.repo.findManyWithRelations(
      { where },
      {
        page: 1,
        limit: 1,
        skip: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    );

    const rule = rules[0];

    if (!rule) {
      throw AppException.notFound('Rule not found');
    }

    return mapRuleRowsToRuntimeRule(rule);
  }

  async findById(id: string, user: AuthPayload) {
    this.checkAccess(user);

    const rule = await this.repo.findByIdWithRelations(id);

    if (!rule) {
      throw AppException.notFound('Rule not found');
    }

    return mapRuleRowsToRuntimeRule(rule);
  }

  async update(id: string, data: UpdateAutomationRuleInput, user: AuthPayload) {
    this.checkAccess(user);

    const existing = await this.repo.findByIdWithRelations(id);
    if (!existing) {
      throw AppException.notFound('Rule not found');
    }

    // 1. Duplicate check if core fields or conditions change
    if (
      data.eventType !== undefined ||
      data.serviceName !== undefined ||
      data.conditions !== undefined
    ) {
      const finalConditions = this.computeFinalConditions(
        existing,
        data.conditions,
      );

      await this.checkDuplicate(
        {
          serviceName: data.serviceName ?? existing.serviceName ?? undefined,
          eventType: data.eventType ?? existing.eventType,
          excludeId: id,
        },
        finalConditions,
      );
    }

    // 2. Update parent fields
    const parentUpdateData: Prisma.AutomationRuleUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.serviceName !== undefined
        ? { serviceName: data.serviceName }
        : {}),
      ...(data.eventType !== undefined ? { eventType: data.eventType } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
    };

    if (Object.keys(parentUpdateData).length > 0) {
      await this.repo.update({
        where: { id },
        data: parentUpdateData,
      });
    }

    // 3. Delegate child operations
    if (data.conditions) {
      await this.conditionService.applyOperations(id, data.conditions);
    }

    if (data.actions) {
      await this.actionService.applyOperations(id, data.actions);
    }

    const updated = await this.repo.findByIdWithRelations(id);
    return mapRuleRowsToRuntimeRule(updated!);
  }

  private computeFinalConditions(
    existing: AutomationRuleWithRelations,
    incomingOperations?: RuntimeConditions,
  ): RuntimeConditions {
    /**
     * Simulates incoming condition operations without touching the database so
     * duplicate detection can compare the final effective rule shape.
     *
     * Warning:
     * This is intentionally not a replacement for DB transactions. It only
     * predicts the final shape for one request in memory.
     */
    const existingRuntime = mapConditionRowsToRuntimeConditions(
      existing.conditions,
    );
    if (!incomingOperations || incomingOperations.length === 0) {
      return existingRuntime;
    }

    // We simulate the operations to find the "effective" conditions for duplicate check
    const finalConditions: RuntimeConditions = [...existingRuntime];

    for (const op of incomingOperations) {
      if (isDeleteCondition(op)) {
        const idx = finalConditions.findIndex((c) => c.id === op.id);
        if (idx !== -1) {
          finalConditions.splice(idx, 1);
        }
      } else if ('id' in op && op.id) {
        const idx = finalConditions.findIndex((c) => c.id === op.id);
        if (idx !== -1) {
          finalConditions[idx] = {
            ...finalConditions[idx],
            ...op,
          } as RuntimeCondition;
        }
      } else {
        finalConditions.push(op);
      }
    }

    return finalConditions;
  }

  async remove(id: string, user: AuthPayload) {
    this.checkAccess(user);

    const result = await this.repo.softDelete(id);

    if (!result.count) {
      throw AppException.notFound('Rule not found or already deleted');
    }

    return { success: true };
  }

  private buildWhereFilter(
    query: RuleQueryFilter,
  ): Prisma.AutomationRuleWhereInput {
    return {
      ...(query.search
        ? {
            OR: RULE_SEARCHABLE_FIELDS.map((field) => ({
              [field]: {
                contains: query.search,
                mode: 'insensitive',
              },
            })),
          }
        : {}),
      ...(query.serviceName
        ? {
            serviceName: query.serviceName,
          }
        : {}),

      ...(query.eventType
        ? {
            eventType: query.eventType,
          }
        : {}),
      ...(query.isActive !== undefined
        ? {
            isActive: query.isActive,
          }
        : {}),

      ...(query.priority !== undefined
        ? {
            priority: query.priority,
          }
        : {}),
    };
  }

  private async checkDuplicate(
    query: {
      serviceName?: string;
      eventType: string;
      excludeId?: string;
    },
    conditions?: RuntimeConditions,
  ) {
    /**
     * Duplicate identity is eventType + optional serviceName + normalized
     * condition set. Actions are intentionally ignored so one event/condition
     * pair cannot accidentally run multiple independent rule bodies.
     *
     * Runtime note:
     * fast-json-stable-stringify makes object key ordering deterministic, then
     * condition objects are sorted so array order does not affect duplicate
     * comparisons.
     */
    const where: Prisma.AutomationRuleWhereInput = {
      eventType: query.eventType,
      deletedAt: null,
      ...(query.serviceName
        ? {
            serviceName: query.serviceName,
          }
        : {}),
      ...(query.excludeId
        ? {
            NOT: {
              id: query.excludeId,
            },
          }
        : {}),
    };

    const rules = await this.repo.findManyWithRelations({ where });

    if (!rules.length) {
      return;
    }

    const target = this.normalizeConditionsForDuplicateCheck(conditions);

    const isDuplicate = rules.some((rule) => {
      const existingConditions = mapConditionRowsToRuntimeConditions(
        rule.conditions,
      );

      const normalizedExisting =
        this.normalizeConditionsForDuplicateCheck(existingConditions);

      return normalizedExisting === target;
    });

    if (isDuplicate) {
      throw AppException.conflict('Duplicate rule exists', {
        code: 'RULE_DUPLICATE',
      });
    }
  }

  private normalizeConditionsForDuplicateCheck(
    conditions?: RuntimeConditions,
  ): string {
    if (!conditions) {
      return stringify({});
    }

    if (Array.isArray(conditions)) {
      const normalized = conditions
        .filter((condition) => {
          if (!condition || typeof condition !== 'object') {
            return false;
          }

          return !(
            ('_delete' in condition && condition._delete === true) ||
            ('isDelete' in condition &&
              (condition as { isDelete?: boolean }).isDelete === true)
          );
        })
        .map((condition) => {
          const {
            id: _id,
            _delete: _deleteFlag,
            isDelete: _isDelete,
            ...rest
          } = condition as unknown as {
            id?: string;
            _delete?: boolean;
            isDelete?: boolean;
          };

          return rest;
        })
        .sort((a, b) => stringify(a).localeCompare(stringify(b)));

      return stringify(normalized);
    }

    return stringify(conditions);
  }
}
