import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors';
import {
  isDeleteCondition,
  isNormalCondition,
  mapConditionRowsToRuntimeConditions,
  mapConditionsInputToCreateRows,
  RuntimeCondition,
  RuntimeConditions,
} from '../mappers/automation-rule.mapper';
import { RuleConditionRepository } from '../repositories/rule-condition.repository';

/**
 * Applies sparse condition operations for an existing automation rule.
 *
 * Flow:
 * RuleService.update()
 * -> RuleConditionService.applyOperations()
 * -> merge partial condition updates with existing row state
 * -> automation-rule.mapper.ts
 * -> RuleConditionRepository
 *
 * Warning:
 * Updates are merge-based. A partial condition update is first converted back
 * to runtime shape, merged, validated, then mapped to Prisma update columns.
 * This prevents incomplete update payloads from corrupting condition rows.
 *
 * @see src/modules/rule/mappers/automation-rule.mapper.ts
 */
@Injectable()
export class RuleConditionService {
  constructor(private readonly repo: RuleConditionRepository) {}

  async applyOperations(
    ruleId: string,
    conditions: RuntimeConditions,
  ): Promise<void> {
    for (let index = 0; index < conditions.length; index += 1) {
      const condition = conditions[index];

      if (!condition) {
        continue;
      }

      if (isDeleteCondition(condition)) {
        await this.repo.softDelete(ruleId, condition.id);
        continue;
      }

      if (condition.id) {
        await this.handleUpdate(ruleId, condition.id, condition, index);
        continue;
      }

      await this.handleCreate(ruleId, condition, index);
    }
  }

  private async handleCreate(
    ruleId: string,
    condition: RuntimeCondition,
    sortOrder: number,
  ): Promise<void> {
    if (!isNormalCondition(condition)) {
      throw AppException.validation('Invalid condition create payload');
    }

    const mapped = mapConditionsInputToCreateRows([condition])[0];

    if (!mapped) {
      throw AppException.validation('Failed to map condition payload');
    }

    await this.repo.create(ruleId, {
      ...mapped,
      sortOrder,
    });
  }

  private async handleUpdate(
    ruleId: string,
    conditionId: string,
    incoming: RuntimeCondition,
    sortOrder: number,
  ): Promise<void> {
    const existingRow = await this.repo.findById(ruleId, conditionId);
    if (!existingRow) {
      throw AppException.notFound(`Condition ${conditionId} not found`);
    }

    const existingRuntime = mapConditionRowsToRuntimeConditions([
      existingRow,
    ])[0];

    if (!existingRuntime || isDeleteCondition(existingRuntime)) {
      throw AppException.notFound(`Condition ${conditionId} not found`);
    }

    // Merge existing runtime condition + incoming partial condition
    const merged = { ...existingRuntime, ...incoming } as RuntimeCondition;

    if (!isNormalCondition(merged)) {
      throw AppException.validation('Merged condition is invalid');
    }

    // Map the merged full condition to Prisma update data
    const mapped = mapConditionsInputToCreateRows([merged])[0];

    if (mapped) {
      const { id: _id, sortOrder: _s, ...updateBody } = mapped;
      await this.repo.update(ruleId, conditionId, {
        ...updateBody,
        sortOrder,
      });
    }
  }
}
