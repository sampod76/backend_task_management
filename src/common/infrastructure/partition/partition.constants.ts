// export const PARTITION_SERVICES: Array<keyof typeof ServiceName> = [
//   'HOLIDAY',
//   'HOLIDAY_ACCOUNT',
//   'NIROPEKKHO_NEWS',
//   'NIROPEKKHO_NEWS_ACCOUNT',
//   'FLYGHOR_AUTH',
//   'FLYGHOR_B2B',
//   'FLYGHOR_B2C',
//   'FLYGHOR_ADMIN',
// ] as const;

import { ServiceName } from '../../constants/automation';

export const PARTITION_SERVICES = Object.values(ServiceName);

export const PARTITION_TABLES = [
  'logs.audit_logs',
  'logs.email_logs',
  'logs.notification_logs',
  'automation.automation_job_logs',
] as const;
