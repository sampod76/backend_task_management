CREATE TYPE "logs"."ServiceName" AS ENUM (
    'HOLIDAY',
    'HOLIDAY_ACCOUNT',
    'NIROPEKKHO_NEWS',
    'NIROPEKKHO_NEWS_ACCOUNT',
    'FLYGHOR_AUTH',
    'FLYGHOR_B2B',
    'FLYGHOR_B2C',
    'FLYGHOR_ADMIN'
);

CREATE TYPE "automation"."AutomationActionType" AS ENUM (
    'AUDIT_LOG',
    'SEND_EMAIL',
    'SEND_NOTIFICATION',
    'SEND_WEBHOOK'
);

CREATE TYPE "automation"."AutomationJobStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'RETRYING'
);

CREATE TYPE "automation"."AutomationIdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TYPE "common"."FileCategory" AS ENUM (
    'image',
    'video',
    'audio',
    'document',
    'pdf',
    'other'
);

CREATE TYPE "common"."StorageProvider" AS ENUM ('aws', 'cloudinary', 'server');

CREATE TYPE "common"."RecordStatus" AS ENUM ('active', 'inactive', 'blocked', 'archived');

CREATE TYPE "auth"."UserRole" AS ENUM ('user', 'admin', 'super_admin');

CREATE TYPE "auth"."AccountType" AS ENUM ('custom', 'google');