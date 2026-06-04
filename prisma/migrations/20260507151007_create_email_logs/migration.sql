CREATE TABLE
    "logs"."email_logs" (
        "id" TEXT NOT NULL,
        "service_name" "logs"."ServiceName" NOT NULL,
        "to" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "provider" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "error" TEXT,
        "sent_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP(3),
        CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id", "service_name")
    )
PARTITION BY
    LIST ("service_name");

CREATE INDEX "email_logs_status_created_at_idx" ON "logs"."email_logs" ("status", "created_at");