import { Injectable, Logger } from '@nestjs/common';
import stableStringify from 'fast-json-stable-stringify';

import { ServiceName } from '../../../common/constants/automation';
import {
  ConditionOperator,
  mapRuleRowsToRuntimeRule,
  RuntimeAutomationRule,
  RuntimeCondition,
  RuntimeConditions,
} from '../../rule/mappers/automation-rule.mapper';
import {
  AutomationActionConfig,
  AutomationEvent,
} from '../types/automation-event.type';
import { EmailActionService } from './email-action.service';
import { NotificationActionService } from './notification-action.service';

import { RuleRepository } from '../../rule/repositories/rule.repository';
import { IdempotencyService } from './idempotency.service';
import { AutomationActionType } from '../constants/automation-constants';

/**
 * Runtime executor for persisted automation rules.
 *
 * Flow:
 * AutomationProcessor.process()
 * -> RuleRepository.findActiveRulesByEventType()
 * -> mapRuleRowsToRuntimeRule()
 * -> matchConditions()
 * -> resolveTemplate()
 * -> IdempotencyService.acquire()
 * -> EmailActionService | NotificationActionService | executeWebhook()
 * -> IdempotencyService.complete()/fail()
 *
 * Side effects:
 * - May create email logs, notification logs, audit logs, webhook calls, and
 *   Pusher events depending on action type.
 * - Failed actions rethrow so BullMQ retries the whole job according to queue
 *   settings. Idempotency keys protect already-completed actions.
 *
 * Warning:
 * Template resolution replaces missing values with empty strings and stringifies
 * objects. Treat action payloads as runtime-derived data, not immutable copies.
 *
 * @see src/modules/automation/processors/automation.processor.ts
 * @see src/modules/rule/mappers/automation-rule.mapper.ts
 * @see src/modules/automation/services/idempotency.service.ts
 */
@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private readonly repo: RuleRepository,
    private readonly emailActionService: EmailActionService,
    private readonly notificationActionService: NotificationActionService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async process(eventData: AutomationEvent) {
    const rules = await this.repo.findActiveRulesByEventType(
      eventData.eventType,
      eventData.serviceName,
    );

    if (!rules.length) {
      this.logger.log(`No active rules found for event=${eventData.eventType}`);
      return;
    }

    const runtimeRules = rules.map(mapRuleRowsToRuntimeRule);
    const matchedRules = runtimeRules.filter((rule) =>
      this.matchConditions(rule.conditions, eventData),
    );

    this.logger.log(
      `Matched rules=${matchedRules.length} for event=${eventData.eventType}`,
    );

    for (const rule of matchedRules) {
      await this.executeRule(rule, eventData);
    }
  }

  private async executeRule(
    rule: RuntimeAutomationRule,
    eventData: AutomationEvent,
  ) {
    /**
     * Executes actions sequentially to preserve action order and make
     * idempotency/side effects easier to reason about. Parallel execution would
     * need separate ordering and failure semantics.
     */
    for (const action of rule.actions) {
      const resolvedAction = this.resolveTemplate(
        action,
        eventData,
      ) as AutomationActionConfig;

      const target = this.getActionTarget(resolvedAction, eventData);
      const idempotencyKey = this.buildIdempotencyKey({
        eventId: eventData.eventId,
        ruleId: rule.id,
        actionType: resolvedAction.type,
        target,
      });
      const acquired = await this.idempotencyService.acquire({
        key: idempotencyKey,
        eventId: eventData.eventId,
        ruleId: rule.id,
        actionType: resolvedAction.type,
        target,
      });

      if (!acquired) {
        continue;
      }

      try {
        switch (resolvedAction.type) {
          case AutomationActionType.SEND_EMAIL:
            await this.emailActionService.send(resolvedAction, eventData, {
              serviceName: this.resolveServiceName(rule, eventData),
            });
            break;

          case AutomationActionType.SEND_NOTIFICATION:
            await this.notificationActionService.send(
              resolvedAction,
              eventData,
              {
                serviceName: this.resolveServiceName(rule, eventData),
              },
            );
            break;

          case AutomationActionType.SEND_WEBHOOK:
            await this.executeWebhook(resolvedAction, eventData, rule.id);
            break;

          default:
            this.logger.warn(
              JSON.stringify({
                message: 'Unknown action type',
                eventId: eventData.eventId,
                ruleId: rule.id,
                actionType: (resolvedAction as { type?: string }).type,
              }),
            );
        }

        await this.idempotencyService.complete(idempotencyKey);
      } catch (error) {
        await this.idempotencyService.fail(idempotencyKey, error);
        throw error;
      }
    }
  }

  private getActionTarget(
    action: AutomationActionConfig,
    eventData: AutomationEvent,
  ): string {
    switch (action.type) {
      case AutomationActionType.SEND_EMAIL:
        return action.to;
      case AutomationActionType.SEND_NOTIFICATION:
        return (
          action.userId ||
          action.audienceKey ||
          this.getByPath(eventData.metadata, 'user.id')?.toString() ||
          eventData.actorId ||
          'unknown-user'
        );
      case AutomationActionType.SEND_WEBHOOK:
        return action.url;
      default:
        return 'unknown-target';
    }
  }

  private buildIdempotencyKey(input: {
    eventId: string;
    ruleId: string;
    actionType: AutomationActionType;
    target: string;
  }): string {
    return stableStringify(input);
  }

  matchConditions(
    conditions: RuntimeConditions,
    eventData: AutomationEvent,
  ): boolean {
    /**
     * Condition logic is AND-only. Empty conditions mean the rule is global for
     * that eventType/serviceName pair.
     */
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      if (!this.matchCondition(condition, eventData)) {
        return false;
      }
    }

    return true;
  }

  private isExecutableCondition(
    condition: RuntimeCondition,
  ): condition is Extract<
    RuntimeCondition,
    { field: string; operator: ConditionOperator }
  > {
    return (
      !('_delete' in condition && condition._delete === true) &&
      !('isDelete' in condition && condition.isDelete === true) &&
      'field' in condition &&
      typeof condition.field === 'string' &&
      condition.field.length > 0 &&
      'operator' in condition &&
      typeof condition.operator === 'string'
    );
  }

  private matchCondition(
    condition: RuntimeCondition,
    eventData: AutomationEvent,
  ): boolean {
    if (!this.isExecutableCondition(condition)) {
      return true; // Skip non-executable conditions (e.g. deletions in progress or partial updates)
    }

    const actualValue = this.getByPath(eventData.metadata, condition.field);

    switch (condition.operator) {
      case 'eq':
        return actualValue === condition.value;

      case 'neq':
        return actualValue !== condition.value;

      case 'gt':
        return Number(actualValue) > Number(condition.value);

      case 'gte':
        return Number(actualValue) >= Number(condition.value);

      case 'lt':
        return Number(actualValue) < Number(condition.value);

      case 'lte':
        return Number(actualValue) <= Number(condition.value);

      case 'in':
        return Array.isArray(condition.value)
          ? condition.value.includes(actualValue)
          : false;

      case 'exists': {
        const exists = actualValue !== undefined && actualValue !== null;
        return condition.value === true ? exists : !exists;
      }

      default:
        return false;
    }
  }

  private resolveTemplate(input: unknown, eventData: AutomationEvent): unknown {
    /**
     * Recursively resolves {{ path.to.value }} placeholders against event
     * metadata first, then the event root. This supports user-authored strings
     * in actions without mutating the persisted rule definition.
     *
     * Serialization warning:
     * Objects become JSON strings when inserted into string templates. Whole
     * payload objects remain objects because recursion only stringifies when the
     * current input is a string.
     */
    if (typeof input === 'string') {
      return input.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
        const normalizedPath = path.trim();
        const value =
          this.getByPath(eventData.metadata, normalizedPath) ??
          this.getByPath(eventData, normalizedPath);

        if (value === undefined || value === null) {
          return '';
        }

        if (typeof value === 'object') {
          return JSON.stringify(value);
        }

        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          typeof value === 'bigint'
        ) {
          return String(value);
        }

        return '';
      });
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.resolveTemplate(item, eventData));
    }

    if (typeof input === 'object' && input !== null) {
      const output: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        output[key] = this.resolveTemplate(value, eventData);
      }
      return output;
    }

    return input;
  }

  private getByPath(source: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, source);
  }

  private resolveServiceName(
    rule: RuntimeAutomationRule,
    eventData: AutomationEvent,
  ): ServiceName {
    if (this.isServiceName(rule.serviceName)) {
      return rule.serviceName;
    }

    if (this.isServiceName(eventData.serviceName)) {
      return eventData.serviceName;
    }

    return ServiceName.FLYGHOR_AUTH;
  }

  private isServiceName(value: unknown): value is ServiceName {
    return (
      typeof value === 'string' &&
      Object.values(ServiceName).includes(value as ServiceName)
    );
  }

  private async executeWebhook(
    action: Extract<
      AutomationActionConfig,
      { type: typeof AutomationActionType.SEND_WEBHOOK }
    >,
    eventData: AutomationEvent,
    ruleId: string,
  ) {
    /**
     * Webhook action executor.
     *
     * Runtime notes:
     * - Timeout is enforced with AbortController.
     * - Non-2xx responses are logged but do not throw, so the action is treated
     *   as completed unless fetch itself fails.
     *
     * TODO:
     * Persist webhook attempt/response metadata in a dedicated log table if
     * delivery auditing becomes a product requirement.
     */
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      action.timeoutMs ?? 10_000,
    );

    try {
      const response = await fetch(action.url, {
        method: action.method ?? 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.stringifyHeaders(action.headers),
        },
        body:
          action.method === 'GET' || action.method === 'DELETE'
            ? undefined
            : JSON.stringify(action.payload ?? {}),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          JSON.stringify({
            message: 'Webhook returned non-success status',
            eventId: eventData.eventId,
            ruleId,
            status: response.status,
          }),
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private stringifyHeaders(
    headers: Record<string, unknown> | undefined,
  ): Record<string, string> {
    if (!headers) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(headers).flatMap(([key, value]) => {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return [[key, String(value)]];
        }

        return [];
      }),
    );
  }
}
