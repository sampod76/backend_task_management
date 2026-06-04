CREATE TABLE
    "auth"."admins" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "first_name" TEXT NOT NULL,
        "last_name" TEXT NOT NULL,
        "phone" VARCHAR(255),
        "address" VARCHAR(255),
        "image_id" TEXT,
        "status" "common"."RecordStatus" NOT NULL DEFAULT 'active',
        "deleted_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
    );

CREATE UNIQUE INDEX "admins_user_id_key" ON "auth"."admins" ("user_id");

CREATE UNIQUE INDEX "admins_image_id_key" ON "auth"."admins" ("image_id");

ALTER TABLE "auth"."admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auth"."admins" ADD CONSTRAINT "admins_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "media"."files" ("id") ON DELETE SET NULL ON UPDATE CASCADE;