import { Prisma } from '../../../generated/prisma/client';
import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationConditionType,
  AutomationConditionValueType,
} from '../../automation/constants/automation-constants';
import type {
  AutomationActionConfig,
  EmailActionConfig,
  NotificationActionConfig,
  WebhookActionConfig,
} from '../../automation/types/automation-event.type';
import type { Action } from '../schemas/create-rule.schema';

/**
 * Canonical mapper layer between API/runtime rule shape and Prisma relation
 * rows.
 *
 * Flow:
 * Rule Create/Update Request
 * -> CreateAutomationRuleSchema/UpdateAutomationRuleSchema
 * -> mapConditionsInputToCreateRows()/mapActionsInputToCreateRows()
 * -> automation_rules + child relation tables
 * -> automationRuleRelationsInclude
 * -> mapRuleRowsToRuntimeRule()
 * -> RuleEngineService.process()
 *
 * Update checklist:
 * - Keep this file in lockstep with prisma/automation-rule.prisma.
 * - Keep NotificationActionConfig fields in sync with notification action rows.
 * - Add tests whenever a condition operator, action type, or JSON field changes.
 *
 * Warning:
 * This file converts DB nulls to runtime undefined for optional fields. That is
 * convenient for templates, but it can hide missing DB data unless downstream
 * services validate required runtime combinations such as eventName + pushChannel.
 *
 * @see prisma/automation-rule.prisma
 * @see src/modules/rule/schemas/create-rule.schema.ts
 * @see src/modules/automation/services/rule-engine.service.ts
 */

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'exists';

export type RuntimeCondition =
  | {
      id?: string;
      field: string;
      operator: ConditionOperator;
      value?: unknown;
      _delete?: false;
      isDelete?: false;
    }
  | {
      id: string;
      field?: string;
      operator?: ConditionOperator;
      value?: unknown;
      _delete?: false;
      isDelete?: false;
    }
  | {
      id: string;
      _delete?: true;
      isDelete?: true;
    };

export type RuntimeConditions = RuntimeCondition[];

export function isNormalCondition(
  condition: RuntimeCondition,
): condition is Extract<
  RuntimeCondition,
  { field: string; operator: ConditionOperator }
> {
  return (
    'field' in condition &&
    typeof condition.field === 'string' &&
    'operator' in condition &&
    typeof condition.operator === 'string'
  );
}

function isNormalActionInput(action: ActionInput): action is NormalActionInput {
  return (
    !isDeleteAction(action) &&
    'type' in action &&
    typeof action.type === 'string'
  );
}

type ActionInput =
  | Action
  | AutomationActionConfig
  | { id: string; isDelete: true }
  | { id: string; _delete: true };

type NormalActionInput = Extract<ActionInput, { type: AutomationActionType }>;

export const automationRuleRelationsInclude = {
  conditions: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  },
  actions: {
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      emailConfig: {
        where: { deletedAt: null, isActive: true },
      },
      notificationConfig: {
        where: { deletedAt: null, isActive: true },
      },
      webhookConfig: {
        where: { deletedAt: null, isActive: true },
      },
    },
  },
} satisfies Prisma.AutomationRuleInclude;

/**
 * Includes every relation needed to execute a rule. Repository reads that feed
 * the rule engine should use this include instead of ad hoc select/include
 * shapes, otherwise mapper output may silently omit action config fields.
 *
 * @see RuleRepository.findActiveRulesByEventType()
 * @see mapActionRowsToRuntimeActions()
 */
export type AutomationRuleWithRelations = Prisma.AutomationRuleGetPayload<{
  include: typeof automationRuleRelationsInclude;
}>;

export type RuntimeAutomationRule = Omit<
  AutomationRuleWithRelations,
  'conditions' | 'actions'
> & {
  conditions: RuntimeConditions;
  actions: AutomationActionConfig[];
};

type ConditionValueColumns = Pick<
  Prisma.AutomationRuleConditionCreateWithoutRuleInput,
  'valueType' | 'stringValue' | 'numberValue' | 'booleanValue' | 'jsonValue'
>;

const CONDITION_OPERATORS = {
  gt: AutomationConditionOperator.GT,
  gte: AutomationConditionOperator.GTE,
  lt: AutomationConditionOperator.LT,
  lte: AutomationConditionOperator.LTE,
  eq: AutomationConditionOperator.EQ,
  neq: AutomationConditionOperator.NEQ,
  in: AutomationConditionOperator.IN,
} as const satisfies Record<
  Exclude<ConditionOperator, 'exists'>,
  AutomationConditionOperator
>;

const CONDITION_OPERATOR_RUNTIME_KEYS: Record<
  AutomationConditionOperator,
  Exclude<ConditionOperator, 'exists'>
> = {
  [AutomationConditionOperator.GT]: 'gt',
  [AutomationConditionOperator.GTE]: 'gte',
  [AutomationConditionOperator.LT]: 'lt',
  [AutomationConditionOperator.LTE]: 'lte',
  [AutomationConditionOperator.EQ]: 'eq',
  [AutomationConditionOperator.NEQ]: 'neq',
  [AutomationConditionOperator.IN]: 'in',
};

export function mapConditionsInputToCreateRows(
  conditions: RuntimeConditions | undefined,
): Prisma.AutomationRuleConditionCreateWithoutRuleInput[] {
  if (!conditions) {
    return [];
  }

  const rows: Prisma.AutomationRuleConditionCreateWithoutRuleInput[] = [];

  for (let index = 0; index < conditions.length; index += 1) {
    const condition = conditions[index];

    if (!condition || isDeleteCondition(condition)) {
      continue;
    }

    rows.push(parseConditionInput(condition, index));
  }

  return rows;
}

/**
 * Converts relational condition rows back into the developer-friendly runtime
 * condition shape used by the matcher.
 *
 * Side effect:
 * Decimal database values become JavaScript numbers. Avoid this for money or
 * high-precision values unless a future condition type preserves Decimal.
 */
export function mapConditionRowsToRuntimeConditions(
  conditionRows: AutomationRuleWithRelations['conditions'],
): RuntimeConditions {
  const runtime: RuntimeConditions = [];

  for (const row of conditionRows) {
    if (row.conditionType === AutomationConditionType.DIRECT) {
      runtime.push({
        id: row.id,
        field: row.fieldPath,
        operator: 'eq',
        value: getConditionValueFromRow(row),
      });
      continue;
    }

    if (row.conditionType === AutomationConditionType.EXISTS) {
      runtime.push({
        id: row.id,
        field: row.fieldPath,
        operator: 'exists',
        value: row.booleanValue ?? false,
      });
      continue;
    }

    if (!row.operator) {
      continue;
    }

    runtime.push({
      id: row.id,
      field: row.fieldPath,
      operator: CONDITION_OPERATOR_RUNTIME_KEYS[row.operator],
      value: getConditionValueFromRow(row),
    });
  }

  return runtime;
}

/**
 * Converts API action inputs into parent AutomationRuleAction rows with nested
 * action-specific config creates.
 *
 * Warning:
 * Delete operations are intentionally skipped here. Updates and deletes are
 * handled by RuleActionService so partial update semantics stay explicit.
 */
export function mapActionsInputToCreateRows(
  actions: ActionInput[],
): Prisma.AutomationRuleActionCreateWithoutRuleInput[] {
  const rows: Prisma.AutomationRuleActionCreateWithoutRuleInput[] = [];

  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];

    if (!action || !isNormalActionInput(action)) {
      continue;
    }

    rows.push(parseActionInput(action, index));
  }

  return rows;
}

/**
 * Converts action relation rows into runtime action configs. This is the exact
 * handoff point where nullable Prisma columns become optional TypeScript fields.
 *
 * Runtime notes:
 * - Missing notificationConfig/emailConfig/webhookConfig skips the action.
 * - pushChannel null becomes undefined and must be guarded before Pusher usage.
 * - payload/headers must be JSON objects; arrays/primitives are dropped.
 *
 * @see NotificationActionService.send()
 * @see PusherService.triggerChannels()
 */
export function mapActionRowsToRuntimeActions(
  actionRows: AutomationRuleWithRelations['actions'],
): AutomationActionConfig[] {
  const runtimeActions: AutomationActionConfig[] = [];

  for (const action of actionRows) {
    if (action.type === AutomationActionType.SEND_EMAIL && action.emailConfig) {
      const config = action.emailConfig;

      runtimeActions.push({
        id: action.id,
        type: AutomationActionType.SEND_EMAIL,
        to: config.to,
        from: config.from ?? undefined,
        cc: config.cc ?? undefined,
        bcc: config.bcc ?? undefined,
        subject: config.subject,
        body: config.body,
      });

      continue;
    }

    if (
      action.type === AutomationActionType.SEND_NOTIFICATION &&
      action.notificationConfig
    ) {
      const config = action.notificationConfig;

      runtimeActions.push({
        id: action.id,
        type: AutomationActionType.SEND_NOTIFICATION,
        channel: config.channel,
        eventName: config.eventName ?? undefined,
        pushChannel: config.pushChannel ?? undefined,
        // userId: config.userId ?? undefined,
        title: config.title,
        message: config.message,
        payload: toRuntimeRecord(config.payload),
        priority: config.priority ?? undefined,
        audienceType: config.audienceType ?? undefined,
        audienceKey: config.audienceKey ?? undefined,
        entityType: config.entityType ?? undefined,
        entityId: config.entityId ?? undefined,
        actionUrl: config.actionUrl ?? undefined,
      });

      continue;
    }

    if (
      action.type === AutomationActionType.SEND_WEBHOOK &&
      action.webhookConfig
    ) {
      const config = action.webhookConfig;

      runtimeActions.push({
        id: action.id,
        type: AutomationActionType.SEND_WEBHOOK,
        url: config.url,
        method: config.method,
        headers: toRuntimeRecord(config.headers),
        payload: toRuntimeRecord(config.payload),
        timeoutMs: config.timeoutMs ?? undefined,
      });
    }
  }

  return runtimeActions;
}

/**
 * Produces the in-memory rule shape consumed by the rule engine.
 *
 * Flow:
 * Prisma AutomationRuleWithRelations
 * -> condition/action runtime configs
 * -> template resolution
 * -> action executor
 */
export function mapRuleRowsToRuntimeRule(
  rule: AutomationRuleWithRelations,
): RuntimeAutomationRule {
  const { conditions, actions, ...baseRule } = rule;

  return {
    ...baseRule,
    conditions: mapConditionRowsToRuntimeConditions(conditions),
    actions: mapActionRowsToRuntimeActions(actions),
  };
}

export function getConditionValueType(
  value: unknown,
): AutomationConditionValueType {
  if (typeof value === 'string') {
    return AutomationConditionValueType.STRING;
  }

  if (typeof value === 'number') {
    return AutomationConditionValueType.NUMBER;
  }

  if (typeof value === 'boolean') {
    return AutomationConditionValueType.BOOLEAN;
  }

  return AutomationConditionValueType.JSON;
}

export function mapValueToConditionColumns(
  value: unknown,
): ConditionValueColumns {
  const valueType = getConditionValueType(value);

  switch (valueType) {
    case AutomationConditionValueType.STRING:
      return {
        valueType,
        stringValue: value as string,
      };

    case AutomationConditionValueType.NUMBER:
      return {
        valueType,
        numberValue: new Prisma.Decimal(value as number),
      };

    case AutomationConditionValueType.BOOLEAN:
      return {
        valueType,
        booleanValue: value as boolean,
      };

    case AutomationConditionValueType.JSON:
      return {
        valueType,
        jsonValue: toPrismaJson(value),
      };

    default:
      return {
        valueType: AutomationConditionValueType.JSON,
        jsonValue: toPrismaJson(value),
      };
  }
}

/**
 * Reads the typed condition value from a Prisma row. Any new condition storage
 * column must be added here and in mapValueToConditionColumns().
 */
export function getConditionValueFromRow(
  row: AutomationRuleWithRelations['conditions'][number],
): unknown {
  switch (row.valueType) {
    case AutomationConditionValueType.STRING:
      return row.stringValue;

    case AutomationConditionValueType.NUMBER:
      return row.numberValue ? Number(row.numberValue) : null;

    case AutomationConditionValueType.BOOLEAN:
      return row.booleanValue;

    case AutomationConditionValueType.JSON:
      return row.jsonValue;

    default:
      return null;
  }
}

export function isDeleteCondition(
  condition: RuntimeCondition,
): condition is Extract<
  RuntimeCondition,
  { id: string; _delete?: true; isDelete?: true }
> {
  return (
    ('_delete' in condition && condition._delete === true) ||
    ('isDelete' in condition && condition.isDelete === true)
  );
}

export function parseConditionInput(
  condition: RuntimeCondition,
  sortOrder: number,
): Prisma.AutomationRuleConditionCreateWithoutRuleInput {
  if (!isNormalCondition(condition)) {
    throw new Error('Cannot parse non-normal condition input');
  }

  const base = {
    ...(condition.id ? { id: condition.id } : {}),
    fieldPath: condition.field,
    sortOrder,
  };

  if (condition.operator === 'exists') {
    return {
      ...base,
      conditionType: AutomationConditionType.EXISTS,
      valueType: AutomationConditionValueType.BOOLEAN,
      booleanValue: condition.value === true,
    };
  }

  return {
    ...base,
    conditionType: AutomationConditionType.OPERATOR,
    operator: CONDITION_OPERATORS[condition.operator],
    ...mapValueToConditionColumns(condition.value),
  };
}

/**
 * Dispatches a normal runtime/API action to the matching Prisma nested create
 * shape. Unsupported action types fail fast so invalid jobs are not enqueued
 * with partially persisted rule rows.
 */
export function parseActionInput(
  action: NormalActionInput,
  sortOrder: number,
): Prisma.AutomationRuleActionCreateWithoutRuleInput {
  const type = (action as { type: AutomationActionType }).type;
  switch (type) {
    case AutomationActionType.SEND_EMAIL:
      return mapEmailActionToCreateRow(action as EmailActionConfig, sortOrder);

    case AutomationActionType.SEND_NOTIFICATION:
      return mapNotificationActionToCreateRow(
        action as NotificationActionConfig,
        sortOrder,
      );

    case AutomationActionType.SEND_WEBHOOK:
      return mapWebhookActionToCreateRow(
        action as WebhookActionConfig,
        sortOrder,
      );

    default:
      throw new Error('Unsupported automation action type');
  }
}

export function isDeleteAction(
  action: ActionInput,
): action is { id: string; _delete?: true; isDelete?: true } {
  return (
    ('_delete' in action && action._delete === true) ||
    ('isDelete' in action &&
      (action as { isDelete?: boolean }).isDelete === true)
  );
}

function mapEmailActionToCreateRow(
  action: EmailActionConfig & { id?: string },
  sortOrder: number,
): Prisma.AutomationRuleActionCreateWithoutRuleInput {
  return {
    ...(action.id ? { id: action.id } : {}),
    type: AutomationActionType.SEND_EMAIL,
    sortOrder,
    emailConfig: {
      create: {
        to: action.to,
        from: action.from,
        cc: action.cc,
        bcc: action.bcc,
        subject: action.subject,
        body: action.body,
      },
    },
  };
}

function mapNotificationActionToCreateRow(
  action: NotificationActionConfig & { id?: string },
  sortOrder: number,
): Prisma.AutomationRuleActionCreateWithoutRuleInput {
  /**
   * Notification action persistence path:
   * API action config
   * -> automation_rule_actions row
   * -> automation_rule_notification_actions row
   * -> RuleEngineService maps it back to NotificationActionConfig
   * -> NotificationActionService writes notification_logs
   * -> PusherService optionally delivers websocket events.
   */
  return {
    ...(action.id ? { id: action.id } : {}),
    type: AutomationActionType.SEND_NOTIFICATION,
    sortOrder,
    notificationConfig: {
      create: {
        channel: action.channel,
        eventName: action.eventName,
        pushChannel: action.pushChannel,
        title: action.title,
        message: action.message,
        payload: toPrismaJson(action.payload),
        priority: action.priority,
        audienceType: action.audienceType,
        audienceKey: action.audienceKey,
        entityType: action.entityType,
        entityId: action.entityId,
        actionUrl: action.actionUrl,
      },
    },
  };
}

function mapWebhookActionToCreateRow(
  action: WebhookActionConfig & { id?: string },
  sortOrder: number,
): Prisma.AutomationRuleActionCreateWithoutRuleInput {
  return {
    ...(action.id ? { id: action.id } : {}),
    type: AutomationActionType.SEND_WEBHOOK,
    sortOrder,
    webhookConfig: {
      create: {
        url: action.url,
        method: action.method,
        headers: toPrismaJson(action.headers),
        payload: toPrismaJson(action.payload),
        timeoutMs: action.timeoutMs,
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return value;
}

function toRuntimeRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? { ...value } : undefined;
}
