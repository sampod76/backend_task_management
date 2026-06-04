/**
 * =========================================
 * Push Channel Naming Convention
 * =========================================
 *
 * Format:
 * - public-{service}
 * - private-{service}-{role}
 * - presence-{service}-{group}
 *
 * Rules:
 * - lowercase
 * - kebab-case
 * - scalable for multi-project architecture
 * - service based isolation
 */

export enum PushChannel {
  // =========================================
  // GLOBAL PUBLIC
  // =========================================
  PUBLIC = 'public',
  //
  PRIVATE_AUTOMATION_ADMIN = 'private-automation-admin',
  // =========================================
  // HOLIDAY
  // =========================================
  PUBLIC_HOLIDAY = 'public-holiday',

  PRIVATE_HOLIDAY_ADMIN = 'private-holiday-admin',
  PRIVATE_HOLIDAY_B2B = 'private-holiday-b2b',
  PRIVATE_HOLIDAY_B2C = 'private-holiday-b2c',

  // =========================================
  // HOLIDAY ACCOUNT
  // =========================================
  PUBLIC_HOLIDAY_ACCOUNT = 'public-holiday-account',

  PRIVATE_HOLIDAY_ACCOUNT_ADMIN = 'private-holiday-account-admin',

  PRIVATE_HOLIDAY_ACCOUNT_B2B = 'private-holiday-account-b2b',

  PRIVATE_HOLIDAY_ACCOUNT_B2C = 'private-holiday-account-b2c',

  // =========================================
  // NIROPEKKHO NEWS
  // =========================================
  PUBLIC_NIROPEKKHO_NEWS = 'public-niropekkho-news',

  PRIVATE_NIROPEKKHO_NEWS_ADMIN = 'private-niropekkho-news-admin',

  PRIVATE_NIROPEKKHO_NEWS_EDITOR = 'private-niropekkho-news-editor',

  PRIVATE_NIROPEKKHO_NEWS_REPORTER = 'private-niropekkho-news-reporter',

  // =========================================
  // NIROPEKKHO NEWS ACCOUNT
  // =========================================
  PUBLIC_NIROPEKKHO_NEWS_ACCOUNT = 'public-niropekkho-news-account',

  PRIVATE_NIROPEKKHO_NEWS_ACCOUNT_ADMIN = 'private-niropekkho-news-account-admin',

  // =========================================
  // FLYGHOR AUTH
  // =========================================
  PUBLIC_FLYGHOR_AUTH = 'public-flyghor-auth',

  PRIVATE_FLYGHOR_AUTH_ADMIN = 'private-flyghor-auth-admin',

  PRIVATE_FLYGHOR_AUTH_USER = 'private-flyghor-auth-user',

  // =========================================
  // FLYGHOR B2B
  // =========================================
  PUBLIC_FLYGHOR_B2B = 'public-flyghor-b2b',

  PRIVATE_FLYGHOR_B2B_ADMIN = 'private-flyghor-b2b-admin',

  PRIVATE_FLYGHOR_B2B_AGENT = 'private-flyghor-b2b-agent',

  PRIVATE_FLYGHOR_B2B_VENDOR = 'private-flyghor-b2b-vendor',

  // =========================================
  // FLYGHOR B2C
  // =========================================
  PUBLIC_FLYGHOR_B2C = 'public-flyghor-b2c',

  PRIVATE_FLYGHOR_B2C_ADMIN = 'private-flyghor-b2c-admin',

  PRIVATE_FLYGHOR_B2C_CUSTOMER = 'private-flyghor-b2c-customer',

  // =========================================
  // FLYGHOR ADMIN
  // =========================================
  PUBLIC_FLYGHOR_ADMIN = 'public-flyghor-admin',

  PRIVATE_FLYGHOR_ADMIN_SUPER_ADMIN = 'private-flyghor-admin-super-admin',

  PRIVATE_FLYGHOR_ADMIN_STAFF = 'private-flyghor-admin-staff',

  // =========================================
  // NARIA TRAVEL AND TOUR
  // =========================================
  PUBLIC_NARIA_TRAVEL_AND_TOUR = 'public-naria-travel-and-tour',

  PRIVATE_NARIA_TRAVEL_AND_TOUR_ADMIN = 'private-naria-travel-and-tour-admin',

  PRIVATE_NARIA_TRAVEL_AND_TOUR_AGENT = 'private-naria-travel-and-tour-agent',

  PRIVATE_NARIA_TRAVEL_AND_TOUR_CUSTOMER = 'private-naria-travel-and-tour-customer',

  // =========================================
  // NARIA TRAVEL AND TOUR ACCOUNT
  // =========================================
  PUBLIC_NARIA_TRAVEL_AND_TOUR_ACCOUNT = 'public-naria-travel-and-tour-account',

  PRIVATE_NARIA_TRAVEL_AND_TOUR_ACCOUNT_ADMIN = 'private-naria-travel-and-tour-account-admin',

  // =========================================
  // HASAN OVERSEAS
  // =========================================
  PUBLIC_HASAN_OVERSEAS = 'public-hasan-overseas',

  PRIVATE_HASAN_OVERSEAS_ADMIN = 'private-hasan-overseas-admin',

  PRIVATE_HASAN_OVERSEAS_AGENT = 'private-hasan-overseas-agent',

  PRIVATE_HASAN_OVERSEAS_CUSTOMER = 'private-hasan-overseas-customer',

  // =========================================
  // HASAN OVERSEAS ACCOUNT
  // =========================================
  PUBLIC_HASAN_OVERSEAS_ACCOUNT = 'public-hasan-overseas-account',

  PRIVATE_HASAN_OVERSEAS_ACCOUNT_ADMIN = 'private-hasan-overseas-account-admin',

  // =========================================
  // NARIA IT SOLUTIONS
  // =========================================
  PUBLIC_NARIA_IT_SOLUTIONS = 'public-naria-it-solutions',

  PRIVATE_NARIA_IT_SOLUTIONS_ADMIN = 'private-naria-it-solutions-admin',

  PRIVATE_NARIA_IT_SOLUTIONS_DEVELOPER = 'private-naria-it-solutions-developer',

  PRIVATE_NARIA_IT_SOLUTIONS_CLIENT = 'private-naria-it-solutions-client',

  // =========================================
  // NARIA IT SOLUTIONS ACCOUNT
  // =========================================
  PUBLIC_NARIA_IT_SOLUTIONS_ACCOUNT = 'public-naria-it-solutions-account',

  PRIVATE_NARIA_IT_SOLUTIONS_ACCOUNT_ADMIN = 'private-naria-it-solutions-account-admin',

  // =========================================
  // RAYHAN ENTERPRISE
  // =========================================
  PUBLIC_RAYHAN_ENTERPRISE = 'public-rayhan-enterprise',

  PRIVATE_RAYHAN_ENTERPRISE_ADMIN = 'private-rayhan-enterprise-admin',

  PRIVATE_RAYHAN_ENTERPRISE_MANAGER = 'private-rayhan-enterprise-manager',

  PRIVATE_RAYHAN_ENTERPRISE_CUSTOMER = 'private-rayhan-enterprise-customer',

  // =========================================
  // RAYHAN ENTERPRISE ACCOUNT
  // =========================================
  PUBLIC_RAYHAN_ENTERPRISE_ACCOUNT = 'public-rayhan-enterprise-account',

  PRIVATE_RAYHAN_ENTERPRISE_ACCOUNT_ADMIN = 'private-rayhan-enterprise-account-admin',
}
export enum PushEvent {
  CHANNEL_NOTIFICATION = 'channel-notification',
  USER_NOTIFICATION = 'user-notification',
  PUBLIC_NOTIFICATION = 'public-notification',
}

export interface PusherUserInfo {
  userId: string;
  role?: string;
  username?: string;
  email?: string;
}

export interface SendUserNotificationPayload {
  userIds: string[];
  eventName: PushEvent | string;
  messageData: Record<string, unknown>;
}

export interface SendChannelNotificationPayload {
  channels: Array<PushChannel | string>;
  eventName: PushEvent | string;
  messageData: Record<string, unknown>;
}
