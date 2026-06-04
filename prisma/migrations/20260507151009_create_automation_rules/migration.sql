CREATE TABLE
    "automation"."automation_rules" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "service_name" TEXT,
        "event_type" TEXT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "priority" INTEGER NOT NULL DEFAULT 100,
        "conditions" JSONB,
        "actions" JSONB NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        "deleted_at" TIMESTAMP(3),
        CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
    );

CREATE INDEX "automation_rules_event_type_is_active_priority_idx" ON "automation"."automation_rules" ("event_type", "is_active", "priority");