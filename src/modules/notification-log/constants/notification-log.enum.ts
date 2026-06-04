/**
 * //! Notification enum mirror of Prisma notification enums.
 *
 * ⚠️ Update both files when changing enum values.
 *
 * @see {@link ../../../../prisma/notification-log.prisma}
 */

export const NotificationChannel = {
  APP: 'APP',
  PUSH: 'PUSH',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSHER: 'PUSHER',
} as const;

export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationType = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  SYSTEM: 'SYSTEM',
  SECURITY: 'SECURITY',
  PAYMENT: 'PAYMENT',
  ORDER: 'ORDER',
  ACCOUNT: 'ACCOUNT',
  PROMOTION: 'PROMOTION',
  REMINDER: 'REMINDER',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type NotificationPriority =
  (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const NotificationAudienceType = {
  USER: 'USER',
  ROLE: 'ROLE',
  GLOBAL: 'GLOBAL',
  SEGMENT: 'SEGMENT',
} as const;

export type NotificationAudienceType =
  (typeof NotificationAudienceType)[keyof typeof NotificationAudienceType];
