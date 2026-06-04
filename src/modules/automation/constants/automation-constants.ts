export const AutomationActionType = {
  AUDIT_LOG: 'AUDIT_LOG',
  SEND_EMAIL: 'SEND_EMAIL',
  SEND_NOTIFICATION: 'SEND_NOTIFICATION',
  SEND_WEBHOOK: 'SEND_WEBHOOK',
} as const;

export type AutomationActionType =
  (typeof AutomationActionType)[keyof typeof AutomationActionType];

export const AutomationConditionType = {
  DIRECT: 'DIRECT',
  EXISTS: 'EXISTS',
  OPERATOR: 'OPERATOR',
} as const;

export type AutomationConditionType =
  (typeof AutomationConditionType)[keyof typeof AutomationConditionType];

export const AutomationConditionOperator = {
  GT: 'GT',
  GTE: 'GTE',
  LT: 'LT',
  LTE: 'LTE',
  EQ: 'EQ',
  NEQ: 'NEQ',
  IN: 'IN',
} as const;

export type AutomationConditionOperator =
  (typeof AutomationConditionOperator)[keyof typeof AutomationConditionOperator];

export const AutomationConditionValueType = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  JSON: 'JSON',
} as const;

export type AutomationConditionValueType =
  (typeof AutomationConditionValueType)[keyof typeof AutomationConditionValueType];

export const AutomationWebhookMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

export type AutomationWebhookMethod =
  (typeof AutomationWebhookMethod)[keyof typeof AutomationWebhookMethod];

export const AutomationJobStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const;

export type AutomationJobStatus =
  (typeof AutomationJobStatus)[keyof typeof AutomationJobStatus];

export const AutomationIdempotencyStatus = {
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type AutomationIdempotencyStatus =
  (typeof AutomationIdempotencyStatus)[keyof typeof AutomationIdempotencyStatus];
