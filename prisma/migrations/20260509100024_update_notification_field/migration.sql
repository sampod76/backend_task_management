/*
  Warnings:

  - The `channel` column on the `notification_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "logs"."NotificationChannel" AS ENUM ('APP', 'PUSH', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "logs"."NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM', 'SECURITY', 'PAYMENT', 'ORDER', 'ACCOUNT', 'PROMOTION', 'REMINDER');

-- CreateEnum
CREATE TYPE "logs"."NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "logs"."NotificationAudienceType" AS ENUM ('USER', 'ROLE', 'GLOBAL', 'SEGMENT');

-- AlterTable
ALTER TABLE "logs"."notification_logs" ADD COLUMN     "action_url" TEXT,
ADD COLUMN     "audience_key" TEXT,
ADD COLUMN     "audience_type" "logs"."NotificationAudienceType" NOT NULL DEFAULT 'USER',
ADD COLUMN     "entity_id" TEXT,
ADD COLUMN     "entity_type" TEXT,
ADD COLUMN     "priority" "logs"."NotificationPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "type" "logs"."NotificationType" NOT NULL DEFAULT 'INFO',
DROP COLUMN "channel",
ADD COLUMN     "channel" "logs"."NotificationChannel" NOT NULL DEFAULT 'APP';

-- CreateIndex
CREATE INDEX "notification_logs_service_name_type_idx" ON "logs"."notification_logs"("service_name", "type");

-- CreateIndex
CREATE INDEX "notification_logs_service_name_audience_type_audience_key_idx" ON "logs"."notification_logs"("service_name", "audience_type", "audience_key");

-- CreateIndex
CREATE INDEX "notification_logs_created_at_idx" ON "logs"."notification_logs"("created_at");
