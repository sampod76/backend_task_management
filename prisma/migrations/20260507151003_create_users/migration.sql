CREATE TABLE
    "auth"."users" (
        "id" TEXT NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "username" VARCHAR(255) NOT NULL,
        "password" TEXT NOT NULL,
        "role" "auth"."UserRole" NOT NULL DEFAULT 'user',
        "account_type" "auth"."AccountType" NOT NULL DEFAULT 'custom',
        "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
        "status" "common"."RecordStatus" NOT NULL DEFAULT 'active',
        "deleted_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
    );

CREATE UNIQUE INDEX "users_email_key" ON "auth"."users" ("email");

CREATE UNIQUE INDEX "users_username_key" ON "auth"."users" ("username");

CREATE INDEX "users_deleted_at_created_at_idx" ON "auth"."users" ("deleted_at", "created_at");

CREATE INDEX "users_status_role_idx" ON "auth"."users" ("status", "role");