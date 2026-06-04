CREATE TABLE
    "logs"."notification_logs" (
        "id" TEXT NOT NULL,
        "service_name" "logs"."ServiceName" NOT NULL,
        "user_id" TEXT,
        "channel" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "payload" JSONB,
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP(3),
        CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id", "service_name")
    )
PARTITION BY
    LIST ("service_name");

CREATE INDEX "notification_logs_user_id_is_read_idx" ON "logs"."notification_logs" ("user_id", "is_read");