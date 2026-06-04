export const NOTIFICATION_LOG_SEARCHABLE_FIELDS = [
  'title',
  'message',
  'userId',
  'audienceKey',
  'entityType',
  'entityId',
] as const;

export const NOTIFICATION_LOG_FILTERABLE_FIELDS = [
  'search',

  'serviceName',
  'userId',

  'channel',
  'type',
  'priority',

  'audienceType',
  'audienceKey',

  'entityType',
  'entityId',

  'isRead',

  'fromDate',
  'toDate',

  'sortBy',
  'sortOrder',
  'page',
  'limit',
] as const;

export const NOTIFICATION_LOG_SORTABLE_FIELDS = [
  'createdAt',
  'title',
  'channel',
  'type',
  'priority',
  'audienceType',
  'isRead',
] as const;
