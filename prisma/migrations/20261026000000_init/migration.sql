-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "schools" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "role" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "token_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_fail" (
    "school_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fails" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),

    CONSTRAINT "login_fail_pkey" PRIMARY KEY ("school_id","name")
);

-- CreateTable
CREATE TABLE "portal_data" (
    "school_id" INTEGER NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "mutation_id" TEXT,

    CONSTRAINT "portal_data_pkey" PRIMARY KEY ("school_id","teacher_name")
);

-- CreateTable
CREATE TABLE "studio_data" (
    "school_id" INTEGER NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "mutation_id" TEXT,

    CONSTRAINT "studio_data_pkey" PRIMARY KEY ("school_id","teacher_name")
);

-- CreateTable
CREATE TABLE "decks" (
    "school_id" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "deck_id" TEXT NOT NULL,
    "name" TEXT,
    "size_bytes" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "decks_pkey" PRIMARY KEY ("school_id","owner","deck_id")
);

-- CreateTable
CREATE TABLE "deck_files" (
    "school_id" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "deck_id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "deck_files_pkey" PRIMARY KEY ("school_id","owner","deck_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_name_key" ON "schools"("name");

-- CreateIndex
CREATE INDEX "idx_accounts_school" ON "accounts"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_school_id_name_key" ON "accounts"("school_id", "name");

-- CreateIndex
CREATE INDEX "idx_portal_school" ON "portal_data"("school_id");

-- CreateIndex
CREATE INDEX "idx_studio_school" ON "studio_data"("school_id");

-- CreateIndex
CREATE INDEX "idx_decks_school_owner" ON "decks"("school_id", "owner");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_data" ADD CONSTRAINT "portal_data_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_data" ADD CONSTRAINT "studio_data_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_files" ADD CONSTRAINT "deck_files_school_id_owner_deck_id_fkey" FOREIGN KEY ("school_id", "owner", "deck_id") REFERENCES "decks"("school_id", "owner", "deck_id") ON DELETE CASCADE ON UPDATE CASCADE;

