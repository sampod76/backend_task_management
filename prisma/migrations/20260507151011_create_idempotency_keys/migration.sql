CREATE TABLE
    "automation"."automation_idempotency_keys" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "event_id" TEXT NOT NULL,
        "rule_id" TEXT,
        "action_type" "automation"."AutomationActionType" NOT NULL,
        "target" TEXT,
        "status" "automation"."AutomationIdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
        "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completed_at" TIMESTAMP(3),
        "failed_at" TIMESTAMP(3),
        "failure_reason" TEXT,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "automation_idempotency_keys_pkey" PRIMARY KEY ("id")
    );

CREATE UNIQUE INDEX "automation_idempotency_keys_key_key" ON "automation"."automation_idempotency_keys" ("key");

CREATE INDEX "automation_idempotency_keys_event_id_idx" ON "automation"."automation_idempotency_keys" ("event_id");

CREATE INDEX "automation_idempotency_keys_status_locked_at_idx" ON "automation"."automation_idempotency_keys" ("status", "locked_at");

CREATE INDEX "automation_idempotency_keys_action_type_target_idx" ON "automation"."automation_idempotency_keys" ("action_type", "target");