-- DropIndex
DROP INDEX "logs"."audit_logs_event_type_created_at_idx";

-- DropIndex
DROP INDEX "logs"."email_logs_status_created_at_idx";

-- DropIndex
DROP INDEX "logs"."notification_logs_user_id_is_read_idx";

-- CreateIndex
CREATE INDEX "audit_logs_service_name_event_type_created_at_idx" ON "logs"."audit_logs"("service_name", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "email_logs_service_name_status_created_at_idx" ON "logs"."email_logs"("service_name", "status", "created_at");

-- CreateIndex
CREATE INDEX "notification_logs_service_name_user_id_is_read_idx" ON "logs"."notification_logs"("service_name", "user_id", "is_read");

-- RenameIndex
ALTER INDEX "automation"."automation_job_logs_service_event_created_idx" RENAME TO "automation_job_logs_service_name_event_type_created_at_idx";

-- RenameIndex
ALTER INDEX "automation"."automation_job_logs_service_event_id_idx" RENAME TO "automation_job_logs_service_name_event_id_idx";

-- RenameIndex
ALTER INDEX "automation"."automation_job_logs_service_status_created_idx" RENAME TO "automation_job_logs_service_name_status_created_at_idx";
