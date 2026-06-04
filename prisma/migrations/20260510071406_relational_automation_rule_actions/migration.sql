DO $$
BEGIN
  CREATE TYPE "automation"."AutomationActionType" AS ENUM (
    'SEND_EMAIL',
    'SEND_NOTIFICATION',
    'SEND_WEBHOOK'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "automation"."AutomationConditionType" AS ENUM ('DIRECT', 'EXISTS', 'OPERATOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "automation"."AutomationConditionOperator" AS ENUM ('GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ', 'IN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "automation"."AutomationConditionValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "automation"."AutomationWebhookMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "automation"."automation_rules"
  DROP COLUMN IF EXISTS "conditions",
  DROP COLUMN IF EXISTS "actions";

ALTER TABLE "logs"."notification_logs"
  ADD COLUMN IF NOT EXISTS "eventName" TEXT;

CREATE TABLE IF NOT EXISTS "automation"."automation_rule_conditions" (
  "id" TEXT NOT NULL,
  "rule_id" TEXT NOT NULL,
  "field_path" TEXT NOT NULL,
  "condition_type" "automation"."AutomationConditionType" NOT NULL,
  "operator" "automation"."AutomationConditionOperator",
  "value_type" "automation"."AutomationConditionValueType",
  "string_value" TEXT,
  "number_value" DECIMAL(65,30),
  "boolean_value" BOOLEAN,
  "json_value" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "automation_rule_conditions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_rule_conditions_rule_id_fkey"
    FOREIGN KEY ("rule_id")
    REFERENCES "automation"."automation_rules"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "automation"."automation_rule_actions" (
  "id" TEXT NOT NULL,
  "rule_id" TEXT NOT NULL,
  "type" "automation"."AutomationActionType" NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "automation_rule_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_rule_actions_rule_id_fkey"
    FOREIGN KEY ("rule_id")
    REFERENCES "automation"."automation_rules"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "automation"."automation_rule_email_actions" (
  "id" TEXT NOT NULL,
  "action_id" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "from" TEXT,
  "cc" TEXT,
  "bcc" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "automation_rule_email_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_rule_email_actions_action_id_key" UNIQUE ("action_id"),
  CONSTRAINT "automation_rule_email_actions_action_id_fkey"
    FOREIGN KEY ("action_id")
    REFERENCES "automation"."automation_rule_actions"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "automation"."automation_rule_notification_actions" (
  "id" TEXT NOT NULL,
  "action_id" TEXT NOT NULL,
  "channel" "logs"."NotificationChannel" NOT NULL DEFAULT 'APP',
  "event_name" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload" JSONB,
  "priority" "logs"."NotificationPriority" DEFAULT 'NORMAL',
  "audience_type" "logs"."NotificationAudienceType" DEFAULT 'USER',
  "audience_key" TEXT,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "action_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "automation_rule_notification_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_rule_notification_actions_action_id_key" UNIQUE ("action_id"),
  CONSTRAINT "automation_rule_notification_actions_action_id_fkey"
    FOREIGN KEY ("action_id")
    REFERENCES "automation"."automation_rule_actions"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "automation"."automation_rule_webhook_actions" (
  "id" TEXT NOT NULL,
  "action_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "method" "automation"."AutomationWebhookMethod" NOT NULL DEFAULT 'POST',
  "headers" JSONB,
  "payload" JSONB,
  "timeout_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "automation_rule_webhook_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_rule_webhook_actions_action_id_key" UNIQUE ("action_id"),
  CONSTRAINT "automation_rule_webhook_actions_action_id_fkey"
    FOREIGN KEY ("action_id")
    REFERENCES "automation"."automation_rule_actions"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "automation_rule_conditions_rule_id_idx"
  ON "automation"."automation_rule_conditions"("rule_id");
CREATE INDEX IF NOT EXISTS "automation_rule_conditions_field_path_idx"
  ON "automation"."automation_rule_conditions"("field_path");
CREATE INDEX IF NOT EXISTS "automation_rule_conditions_condition_type_idx"
  ON "automation"."automation_rule_conditions"("condition_type");
CREATE INDEX IF NOT EXISTS "automation_rule_conditions_deleted_at_idx"
  ON "automation"."automation_rule_conditions"("deleted_at");

CREATE INDEX IF NOT EXISTS "automation_rule_actions_rule_id_idx"
  ON "automation"."automation_rule_actions"("rule_id");
CREATE INDEX IF NOT EXISTS "automation_rule_actions_type_idx"
  ON "automation"."automation_rule_actions"("type");
CREATE INDEX IF NOT EXISTS "automation_rule_actions_rule_id_type_sort_order_idx"
  ON "automation"."automation_rule_actions"("rule_id", "type", "sort_order");
CREATE INDEX IF NOT EXISTS "automation_rule_actions_is_active_deleted_at_idx"
  ON "automation"."automation_rule_actions"("is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "automation_rule_email_actions_deleted_at_idx"
  ON "automation"."automation_rule_email_actions"("deleted_at");

CREATE INDEX IF NOT EXISTS "automation_rule_notification_actions_channel_idx"
  ON "automation"."automation_rule_notification_actions"("channel");
CREATE INDEX IF NOT EXISTS "automation_rule_notification_actions_audience_type_audience_key_idx"
  ON "automation"."automation_rule_notification_actions"("audience_type", "audience_key");
CREATE INDEX IF NOT EXISTS "automation_rule_notification_actions_deleted_at_idx"
  ON "automation"."automation_rule_notification_actions"("deleted_at");

CREATE INDEX IF NOT EXISTS "automation_rule_webhook_actions_method_idx"
  ON "automation"."automation_rule_webhook_actions"("method");
CREATE INDEX IF NOT EXISTS "automation_rule_webhook_actions_deleted_at_idx"
  ON "automation"."automation_rule_webhook_actions"("deleted_at");

CREATE INDEX IF NOT EXISTS "automation_rules_deleted_at_idx"
  ON "automation"."automation_rules"("deleted_at");
