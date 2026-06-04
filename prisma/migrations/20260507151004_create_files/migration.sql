CREATE TABLE
    "media"."files" (
        "id" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "mimetype" TEXT NOT NULL,
        "size" INTEGER NOT NULL DEFAULT 0,
        "storage" "common"."StorageProvider" NOT NULL DEFAULT 'aws',
        "path" TEXT NOT NULL,
        "url" TEXT,
        "file_key" TEXT NOT NULL,
        "category" "common"."FileCategory" NOT NULL DEFAULT 'image',
        "entity_id" TEXT,
        "entity_type" TEXT,
        "created_by_id" TEXT,
        "is_primary" BOOLEAN NOT NULL DEFAULT false,
        "is_public" BOOLEAN NOT NULL DEFAULT true,
        "title" TEXT,
        "caption" TEXT,
        "metadata" JSONB,
        "deleted_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "files_pkey" PRIMARY KEY ("id")
    );

CREATE UNIQUE INDEX "files_file_key_key" ON "media"."files" ("file_key");

CREATE INDEX "files_entity_type_entity_id_is_primary_idx" ON "media"."files" ("entity_type", "entity_id", "is_primary");

CREATE INDEX "files_deleted_at_created_at_idx" ON "media"."files" ("deleted_at", "created_at");

ALTER TABLE "media"."files" ADD CONSTRAINT "files_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;