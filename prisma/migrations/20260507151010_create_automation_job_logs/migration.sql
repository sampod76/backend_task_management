CREATE TABLE
    "automation"."automation_job_logs" (
        "id" TEXT NOT NULL,
        "service_name" "logs"."ServiceName" NOT NULL,
        "event_id" TEXT NOT NULL,
        "event_type" TEXT NOT NULL,
        "action_type" "automation"."AutomationActionType" NOT NULL,
        "status" "automation"."AutomationJobStatus" NOT NULL DEFAULT 'PENDING',
        "payload" JSONB NOT NULL,
        "error" TEXT,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "started_at" TIMESTAMP(3),
        "completed_at" TIMESTAMP(3),
        "failed_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP(3),
        CONSTRAINT "automation_job_logs_pkey" PRIMARY KEY ("id", "service_name")
    )
PARTITION BY
    LIST ("service_name");

CREATE INDEX "automation_job_logs_service_event_created_idx" ON "automation"."automation_job_logs" ("service_name", "event_type", "created_at");

CREATE INDEX "automation_job_logs_service_status_created_idx" ON "automation"."automation_job_logs" ("service_name", "status", "created_at");

CREATE INDEX "automation_job_logs_service_event_id_idx" ON "automation"."automation_job_logs" ("service_name", "event_id");