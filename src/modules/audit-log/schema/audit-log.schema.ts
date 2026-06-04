import { z } from 'zod';
import { EventType } from '../constants/audit-log.enum';
import { ServiceName } from '../../../common/constants/automation';

/**
 * Automation event ingress schema.
 *
 * Flow:
 * Queue producer publishes AutomationEvent
 * -> AutomationProcessor validates with AuditLogSchema
 * -> AuditLogAutoMationService persists audit log
 * -> RuleEngineService matches eventType/serviceName/metadata
 *
 * Update checklist:
 * - Keep AutomationEvent type alias in automation-event.type.ts aligned.
 * - Any new metadata paths used by rule templates must be represented here.
 * - Avoid broadening metadata too far or rules become hard to validate.
 *
 * Warning:
 * RuleEngineService resolves templates against metadata first, then the event
 * root. Renaming metadata fields can break existing persisted rules.
 *
 * @see src/modules/automation/types/automation-event.type.ts
 * @see src/modules/automation/processors/automation.processor.ts
 */

/**
 * Changed Fields Schema
 */
const ChangedFieldValueSchema = z.object({
  from: z.any().optional(),
  to: z.any().optional(),
});

export const ChangedFieldsSchema = z.record(
  z.string(),
  ChangedFieldValueSchema,
);

/**
 * Metadata Schema (you can extend later)
 */
export const MetadataSchema = z.object({
  user: z
    .object({
      userId: z.string(),
      email: z.string().optional(),
      role: z.string(),
      name: z.string().optional(),
    })
    .optional(),
  payload: z.object({}).optional(),
});

/**
 * Main AuditLog Schema
 */
export const AuditLogSchema = z.object({
  eventId: z.string(),
  eventType: z.enum(Object.values(EventType)),
  serviceName: z.enum(Object.values(ServiceName)),

  entity: z.string().optional(), // table name

  entityId: z.string().optional(), // table id

  action: z.string().min(1, 'action is required'), // action name e.g. create, update, delete,
  //
  result: z.enum(['SUCCESS', 'FAILURE']).optional(),
  errorMessage: z.string().optional(),
  //
  actorId: z.string().optional(),

  actorType: z.string().optional(), // user, admin

  actorEmail: z.string().email().optional(),

  oldData: z.any().optional(), // data before update -> Not used at this moment

  newData: z.any().optional(), // data before update -> Not used at this moment

  changedFields: ChangedFieldsSchema.optional(),

  metadata: MetadataSchema.optional(),

  requestId: z.string().optional(),

  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
