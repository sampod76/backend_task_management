import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors';
import { Prisma } from '../../../generated/prisma/client';
import { AutomationActionType } from '../../automation/constants/automation-constants';
import {
  isDeleteAction,
  mapActionsInputToCreateRows,
} from '../mappers/automation-rule.mapper';
import { RuleActionRepository } from '../repositories/rule-action.repository';
import { Action } from '../schemas/create-rule.schema';

/**
 * Applies action-level create/update/delete operations for an existing rule.
 *
 * Flow:
 * RuleService.update()
 * -> RuleActionService.applyOperations()
 * -> RuleActionRepository
 * -> action-specific config table
 *
 * Warning:
 * The update path is sparse and preserves existing DB values. When adding
 * fields, validate dangerous field combinations against existingConfig here,
 * not only in Zod, because update payloads can omit required paired fields.
 *
 * @see src/modules/rule/schemas/create-rule.schema.ts
 * @see src/modules/rule/mappers/automation-rule.mapper.ts
 */
@Injectable()
export class RuleActionService {
  constructor(private readonly repo: RuleActionRepository) {}

  async applyOperations(ruleId: string, actions: Action[]) {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      if (isDeleteAction(action)) {
        await this.repo.softDelete(ruleId, action.id);
      } else if ('id' in action && action.id) {
        await this.handleUpdate(ruleId, action.id, action);
      } else {
        await this.handleCreate(ruleId, action, i);
      }
    }
  }

  private async handleCreate(
    ruleId: string,
    action: Action,
    sortOrder: number,
  ) {
    const mapped = mapActionsInputToCreateRows([action])[0];
    if (mapped) {
      await this.repo.create(ruleId, {
        ...mapped,
        sortOrder,
      });
    }
  }

  private async handleUpdate(
    ruleId: string,
    actionId: string,
    incoming: Record<string, unknown>,
  ) {
    const existingAction = await this.repo.findActiveByRuleId(ruleId, actionId);
    if (!existingAction) {
      throw AppException.notFound(`Action ${actionId} not found`);
    }

    const incomingType = incoming.type as string | undefined;
    if (incomingType && incomingType !== existingAction.type) {
      throw AppException.conflict(
        `Cannot change action type from ${existingAction.type} to ${incomingType}`,
      );
    }

    const type = incomingType || existingAction.type;

    switch (type) {
      case AutomationActionType.SEND_EMAIL:
        await this.repo.updateEmailConfig(
          actionId,
          this.buildEmailUpdateData(incoming),
        );
        break;
      case AutomationActionType.SEND_NOTIFICATION:
        await this.updateNotificationConfig(actionId, incoming);
        break;
      case AutomationActionType.SEND_WEBHOOK:
        await this.repo.updateWebhookConfig(
          actionId,
          this.buildWebhookUpdateData(incoming),
        );
        break;
      default:
        throw AppException.badRequest(`Unsupported action type: ${type}`);
    }
  }

  private buildEmailUpdateData(
    incoming: Record<string, unknown>,
  ): Prisma.AutomationRuleEmailActionUpdateInput {
    const {
      id: _id,
      type: _type,
      _delete: _d,
      isDelete: _isd,
      ...rest
    } = incoming;
    return rest;
  }

  private buildNotificationUpdateData(
    incoming: Record<string, unknown>,
  ): Prisma.AutomationRuleNotificationActionUpdateInput {
    const {
      id: _id,
      type: _type,
      _delete: _d,
      isDelete: _isd,
      userId: _u,
      ...rest
    } = incoming;
    return {
      ...rest,
      ...(rest.payload ? { payload: rest.payload } : {}),
    };
  }

  private async updateNotificationConfig(
    actionId: string,
    incoming: Record<string, unknown>,
  ) {
    /**
     * Guards websocket delivery invariants during sparse updates.
     *
     * A notification eventName without pushChannel can create notification_logs
     * but cannot safely deliver to Pusher. This merge check prevents old null
     * push_channel rows from being preserved when the action is updated.
     */
    const existingConfig =
      await this.repo.findActiveNotificationConfig(actionId);

    if (!existingConfig) {
      throw AppException.notFound(
        `Notification config for action ${actionId} not found`,
      );
    }

    const updateData = this.buildNotificationUpdateData(incoming);
    const incomingEventName =
      typeof incoming.eventName === 'string'
        ? incoming.eventName.trim()
        : undefined;
    const incomingPushChannel =
      typeof incoming.pushChannel === 'string'
        ? incoming.pushChannel.trim()
        : undefined;
    const finalEventName = incomingEventName ?? existingConfig.eventName;
    const finalPushChannel = incomingPushChannel ?? existingConfig.pushChannel;

    if (finalEventName && !finalPushChannel?.trim()) {
      throw AppException.validation(
        'pushChannel is required when notification eventName is set',
        {
          actionId,
          eventName: finalEventName,
        },
      );
    }

    await this.repo.updateNotificationConfig(actionId, updateData);
  }

  private buildWebhookUpdateData(
    incoming: Record<string, unknown>,
  ): Prisma.AutomationRuleWebhookActionUpdateInput {
    const {
      id: _id,
      type: _type,
      _delete: _d,
      isDelete: _isd,
      ...rest
    } = incoming;
    return {
      ...rest,
      ...(rest.headers ? { headers: rest.headers } : {}),
      ...(rest.payload ? { payload: rest.payload } : {}),
    };
  }
}
