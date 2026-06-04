import { z } from 'zod';
import { EventType } from '../../audit-log/constants/audit-log.enum';
import { ServiceName } from '../../../common/constants/automation';
import {
  NotificationAudienceType,
  NotificationChannel,
  NotificationPriority,
} from '../../notification-log/constants/notification-log.enum';
import { AutomationWebhookMethod } from '../../automation/constants/automation-constants';

/**
 * Validation boundary for automation rule writes.
 *
 * Flow:
 * RuleController.create()/update()
 * -> ZodValidationPipe
 * -> RuleService duplicate checks
 * -> automation-rule.mapper.ts
 * -> Prisma relation rows
 * -> RuleEngineService runtime mapping
 *
 * Update checklist:
 * - If Prisma action config models change, update this file and automation-rule.mapper.ts together.
 * - If notification websocket payloads change, update NotificationActionConfig and Pusher schemas too.
 * - Keep create schemas stricter than update schemas; update paths merge with existing DB state.
 *
 * @see src/modules/rule/controllers/rule.controller.ts
 * @see src/modules/rule/mappers/automation-rule.mapper.ts
 * @see src/modules/automation/types/automation-event.type.ts
 * @see src/common/pipes/zod-validation.pipe.ts
 */

/**
 * Pusher channel names are persisted in automation_rule_notification_actions
 * and later copied into notification_logs before delivery. Empty or malformed
 * values can silently drop channel delivery, so validation happens at rule
 * write time and again at the Pusher boundary.
 *
 * Warning:
 * Existing legacy rows can still contain null push_channel values. The update
 * service guards against preserving eventName without pushChannel, but old rows
 * should be backfilled separately.
 *
 * @see src/modules/automation/services/notification-action.service.ts
 * @see src/common/lib/pusher/schemas/pusher.schema.ts
 */
const PusherChannelNameSchema = z
  .string()
  .trim()
  .min(1, 'pushChannel is required')
  .regex(
    /^(?:public|(?:public|private|presence)-[A-Za-z0-9_\-=@,.;]+)$/,
    'pushChannel must be a valid public/private/presence Pusher channel',
  );

const PusherEventNameSchema = z.string().trim().min(1, 'eventName is required');

/**
 * ==============================
 * CONDITIONS SCHEMA
 * ==============================
 *
 * Condition values are normalized into typed relational columns instead of a
 * JSON blob. This lets duplicate checks, execution, and reporting reason about
 * condition type without reparsing arbitrary payload structures.
 *
 * @see src/modules/rule/mappers/automation-rule.mapper.ts
 * @see prisma/automation-rule.prisma
 */

const ConditionOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'exists',
]);

const ConditionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
  z.record(z.string(), z.unknown()),
]);

const ConditionCreateSchema = z
  .object({
    field: z.string().min(1),
    operator: ConditionOperatorSchema,
    value: ConditionValueSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.operator === 'exists') {
      if (typeof data.value !== 'boolean') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'exists operator requires boolean value',
          path: ['value'],
        });
      }
      return;
    }

    if (data.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'value is required',
        path: ['value'],
      });
    }

    if (data.operator === 'in' && !Array.isArray(data.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'in operator requires array value',
        path: ['value'],
      });
    }
  });

const ConditionUpdateSchema = z
  .object({
    id: z.string().uuid(),
    field: z.string().min(1).optional(),
    operator: ConditionOperatorSchema.optional(),
    value: ConditionValueSchema.optional(),
  })
  .strict()
  .refine(
    (data) => {
      const { id: _id, ...rest } = data;
      return Object.keys(rest).length > 0;
    },
    { message: 'At least one field to update must be provided' },
  );

const DeleteConditionSchema = z
  .object({
    id: z.string().uuid(),
    _delete: z.literal(true).optional(),
    isDelete: z.literal(true).optional(),
  })
  .strict()
  .refine((data) => data._delete === true || data.isDelete === true, {
    message: 'Either _delete or isDelete must be true',
  });

/**
 * ==============================
 * ACTIONS SCHEMA
 * ==============================
 *
 * Action schemas define the public API shape. The mapper converts each action
 * into one AutomationRuleAction row plus one action-specific config row.
 *
 * Warning:
 * Do not add fields here without also updating NotificationActionConfig or the
 * relevant Email/Webhook config interface and mapper functions.
 *
 * @see mapActionsInputToCreateRows()
 * @see src/modules/automation/services/rule-engine.service.ts
 */

const SendEmailActionCreateSchema = z
  .object({
    type: z.literal('SEND_EMAIL'),
    to: z.string(),
    from: z.string().optional(),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    subject: z.string(),
    body: z.string(),
  })
  .strict();

const SendNotificationActionCreateSchema = z
  .object({
    type: z.literal('SEND_NOTIFICATION'),
    channel: z
      .enum(Object.values(NotificationChannel))
      .optional()
      .default('PUSHER'),
    pushChannel: PusherChannelNameSchema, // PushChannel -> prisma\automation-rule.prisma
    eventName: PusherEventNameSchema, // PushEvent -> prisma\automation-rule.prisma
    userId: z.string().optional(), // when push any notification any single user
    title: z.string(),
    message: z.string(),
    payload: z.record(z.string(), z.unknown()).optional(),
    priority: z.enum(Object.values(NotificationPriority)).optional(),
    audienceType: z.enum(Object.values(NotificationAudienceType)).optional(),
    audienceKey: z.string().optional(),
    actionUrl: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
  })
  .strict();

const SendWebhookActionCreateSchema = z
  .object({
    type: z.literal('SEND_WEBHOOK'),
    url: z.string().url(),
    method: z
      .enum(Object.values(AutomationWebhookMethod))
      .optional()
      .default('POST'),
    headers: z.record(z.string(), z.unknown()).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    timeoutMs: z.number().int().positive().optional(),
  })
  .strict();

const SendEmailActionUpdateSchema = z
  .object({
    id: z.string().uuid(),
    type: z.literal('SEND_EMAIL').optional(),
    to: z.string().optional(),
    from: z.string().optional(),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const { id: _id, type: _type, ...rest } = data;
      return Object.keys(rest).length > 0;
    },
    { message: 'At least one email update field must be provided' },
  );

const SendNotificationActionUpdateSchema = z
  .object({
    id: z.string().uuid(),
    type: z.literal('SEND_NOTIFICATION'),
    channel: z.enum(Object.values(NotificationChannel)).optional(),
    pushChannel: PusherChannelNameSchema.optional(), // PushChannel -> prisma\automation-rule.prisma
    eventName: PusherEventNameSchema.optional(), // PushEvent -> prisma\automation-rule.prisma
    userId: z.string().optional(), // when push any notification any single user
    title: z.string().optional(),
    message: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    priority: z.enum(Object.values(NotificationPriority)).optional(),
    audienceType: z.enum(Object.values(NotificationAudienceType)).optional(),
    audienceKey: z.string().optional(),
    actionUrl: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const { id: _id, type: _type, ...rest } = data;
      return Object.keys(rest).length > 0;
    },
    { message: 'At least one notification update field must be provided' },
  );

const SendWebhookActionUpdateSchema = z
  .object({
    id: z.string().uuid(),
    type: z.literal('SEND_WEBHOOK').optional(),
    url: z.string().url().optional(),
    method: z.enum(Object.values(AutomationWebhookMethod)).optional(),
    headers: z.record(z.string(), z.unknown()).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    timeoutMs: z.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const { id: _id, type: _type, ...rest } = data;
      return Object.keys(rest).length > 0;
    },
    { message: 'At least one webhook update field must be provided' },
  );

const DeleteActionSchema = z
  .object({
    id: z.string().uuid(),
    _delete: z.literal(true).optional(),
    isDelete: z.literal(true).optional(),
  })
  .strict()
  .refine((data) => data._delete === true || data.isDelete === true, {
    message: 'Either _delete or isDelete must be true',
  })
  .transform((data) => {
    const { isDelete: _isDelete, ...rest } = data;
    return {
      ...rest,
      _delete: true as const,
    };
  });

/**
 * ==============================
 * FINAL EXPORTED SCHEMAS
 * ==============================
 *
 * These are the only schemas used by RuleController. They intentionally use
 * strict objects to reject unknown fields at the API boundary before data can
 * drift away from the Prisma relation model.
 */

export const CreateAutomationRuleSchema = z
  .object({
    name: z.string().min(1),
    serviceName: z.enum(Object.values(ServiceName)).optional(),
    eventType: z.enum(Object.values(EventType)),
    isActive: z.boolean().optional().default(true),
    priority: z.number().int().min(1).max(1000).optional().default(100),
    conditions: z.array(ConditionCreateSchema).optional(),
    actions: z.array(
      z.discriminatedUnion('type', [
        SendEmailActionCreateSchema,
        SendNotificationActionCreateSchema,
        SendWebhookActionCreateSchema,
      ]),
    ),
    description: z.string().optional(),
  })
  .strict();

const ConditionOperationSchema = z.union([
  DeleteConditionSchema,
  ConditionUpdateSchema,
  ConditionCreateSchema,
]);

const ActionOperationSchema = z.union([
  DeleteActionSchema,
  SendEmailActionUpdateSchema,
  SendNotificationActionUpdateSchema,
  SendWebhookActionUpdateSchema,
  z.discriminatedUnion('type', [
    SendEmailActionCreateSchema,
    SendNotificationActionCreateSchema,
    SendWebhookActionCreateSchema,
  ]),
]);

export const UpdateAutomationRuleSchema = z
  .object({
    name: z.string().min(1).optional(),
    serviceName: z.enum(Object.values(ServiceName)).optional(),
    eventType: z.enum(Object.values(EventType)).optional(),
    isActive: z.boolean().optional(),
    priority: z.number().int().min(1).max(1000).optional(),
    conditions: z.array(ConditionOperationSchema).optional(),
    actions: z.array(ActionOperationSchema).optional(),
    description: z.string().optional(),
  })
  .strict();

export type CreateAutomationRuleInput = z.infer<
  typeof CreateAutomationRuleSchema
>;
export type UpdateAutomationRuleInput = z.infer<
  typeof UpdateAutomationRuleSchema
>;

// Shared action type for convenience
export type Action =
  | z.infer<typeof SendEmailActionCreateSchema>
  | z.infer<typeof SendNotificationActionCreateSchema>
  | z.infer<typeof SendWebhookActionCreateSchema>
  | z.infer<typeof DeleteActionSchema>
  | z.infer<typeof SendEmailActionUpdateSchema>
  | z.infer<typeof SendNotificationActionUpdateSchema>
  | z.infer<typeof SendWebhookActionUpdateSchema>;
