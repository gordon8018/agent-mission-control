-- PR1: Database schema + migrations for workflows and OpenClaw agent mapping

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskType') THEN
    CREATE TYPE "TaskType" AS ENUM ('DEV', 'RESEARCH');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpenclawLinkStatus') THEN
    CREATE TYPE "OpenclawLinkStatus" AS ENUM ('UNLINKED', 'LINKED', 'INVALID', 'UNKNOWN');
  END IF;
END $$;

-- 2) tasks: taskType + artifacts + gates
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "taskType" "TaskType" NOT NULL DEFAULT 'DEV';

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "artifacts" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "gates" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- normalize defaults even when the column already existed
ALTER TABLE "tasks" ALTER COLUMN "artifacts" SET DEFAULT '[]'::jsonb;
ALTER TABLE "tasks" ALTER COLUMN "gates" SET DEFAULT '{}'::jsonb;

UPDATE "tasks" SET "artifacts" = '[]'::jsonb WHERE "artifacts" IS NULL;
UPDATE "tasks" SET "gates" = '{}'::jsonb WHERE "gates" IS NULL;

ALTER TABLE "tasks" ALTER COLUMN "artifacts" SET NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "gates" SET NOT NULL;

-- 3) workflow_templates table
CREATE TABLE IF NOT EXISTS "workflow_templates" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text NOT NULL,
  "taskType" "TaskType" NOT NULL,
  "stages" jsonb NOT NULL,
  "stageRules" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- 4) task_columns extensions
ALTER TABLE "task_columns"
  ADD COLUMN IF NOT EXISTS "taskType" "TaskType";

ALTER TABLE "task_columns"
  ADD COLUMN IF NOT EXISTS "defaultRole" text;

ALTER TABLE "task_columns"
  ADD COLUMN IF NOT EXISTS "requiredArtifacts" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "task_columns"
  ADD COLUMN IF NOT EXISTS "requiredGates" jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "task_columns_taskType_position_idx"
  ON "task_columns" ("taskType", "position");

-- 5) agents OpenClaw mapping
ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "openclawAgentId" text;

ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "openclawLinkStatus" "OpenclawLinkStatus" NOT NULL DEFAULT 'UNLINKED';

ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "openclawLastValidatedAt" timestamptz;

CREATE INDEX IF NOT EXISTS "agents_openclawAgentId_idx"
  ON "agents" ("openclawAgentId");

CREATE INDEX IF NOT EXISTS "agents_openclawLinkStatus_idx"
  ON "agents" ("openclawLinkStatus");
