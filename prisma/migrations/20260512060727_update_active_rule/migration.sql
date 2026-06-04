-- AlterTable
ALTER TABLE "automation"."automation_rule_conditions" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "automation"."automation_rule_email_actions" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "automation"."automation_rule_notification_actions" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "automation"."automation_rule_webhook_actions" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
