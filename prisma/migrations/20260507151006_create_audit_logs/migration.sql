CREATE TABLE
    "logs"."audit_logs" (
        "id" TEXT NOT NULL,
        "event_id" TEXT,
        "event_type" TEXT NOT NULL,
        "service_name" "logs"."ServiceName" NOT NULL,
        "entity" TEXT,
        "entity_id" TEXT,
        "action" TEXT,
        "result" TEXT NOT NULL DEFAULT 'SUCCESS',
        "error_message" TEXT,
        "actor_id" TEXT,
        "actor_type" TEXT,
        "actor_email" TEXT,
        "old_data" JSONB,
        "new_data" JSONB,
        "changed_fields" JSONB,
        "metadata" JSONB,
        "request_id" TEXT,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP(3),
        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id", "service_name")
    )
PARTITION BY
    LIST ("service_name");

CREATE INDEX "audit_logs_event_type_created_at_idx" ON "logs"."audit_logs" ("event_type", "created_at");