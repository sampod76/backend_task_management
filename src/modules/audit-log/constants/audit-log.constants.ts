export const AUDIT_LOG_SEARCHABLE_FIELDS = [
  'eventType',
  'serviceName',
  'entity',
  'entityId',
  'action',
  'actorEmail',
  'requestId',
] as const;

// AUDIT_LOG_FILTERABLE_FIELDS = AuditLogQueryFilterSchema

export const AUDIT_LOG_SORTABLE_FIELDS = [
  'createdAt',
  'eventType',
  'serviceName',
  'entity',
  'entityId',
  'action',
  'result',
];
