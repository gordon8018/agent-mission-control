-- PR1: Swarm orchestration data models + baseline tables

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SwarmRunStatus') THEN
    CREATE TYPE "SwarmRunStatus" AS ENUM ('PENDING', 'RUNNING', 'RETRY_REQUESTED', 'SUCCESS', 'FAILED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SwarmWorktreeStatus') THEN
    CREATE TYPE "SwarmWorktreeStatus" AS ENUM ('PROVISIONING', 'READY', 'DIRTY', 'ARCHIVED', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SwarmSessionStatus') THEN
    CREATE TYPE "SwarmSessionStatus" AS ENUM ('STARTING', 'ACTIVE', 'IDLE', 'COMPLETED', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SwarmPRStatus') THEN
    CREATE TYPE "SwarmPRStatus" AS ENUM ('DRAFT', 'OPEN', 'MERGED', 'CLOSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SwarmCheckStatus') THEN
    CREATE TYPE "SwarmCheckStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'SKIPPED');
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "swarm_runs" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "taskId" text NOT NULL,
  "status" "SwarmRunStatus" NOT NULL DEFAULT 'PENDING',
  "snapshot" jsonb,
  "retryRequested" boolean NOT NULL DEFAULT false,
  "startedAt" timestamptz,
  "completedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "swarm_runs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "swarm_worktrees" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "swarmRunId" text NOT NULL,
  "branch" text,
  "path" text,
  "status" "SwarmWorktreeStatus" NOT NULL DEFAULT 'PROVISIONING',
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "swarm_worktrees_swarmRunId_fkey" FOREIGN KEY ("swarmRunId") REFERENCES "swarm_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "swarm_sessions" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "swarmRunId" text NOT NULL,
  "externalId" text,
  "status" "SwarmSessionStatus" NOT NULL DEFAULT 'STARTING',
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "swarm_sessions_swarmRunId_fkey" FOREIGN KEY ("swarmRunId") REFERENCES "swarm_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "swarm_prs" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "swarmRunId" text NOT NULL,
  "repo" text,
  "prNumber" integer,
  "status" "SwarmPRStatus" NOT NULL DEFAULT 'DRAFT',
  "title" text,
  "url" text,
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "swarm_prs_swarmRunId_fkey" FOREIGN KEY ("swarmRunId") REFERENCES "swarm_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "swarm_checks" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "swarmPrId" text NOT NULL,
  "name" text NOT NULL,
  "status" "SwarmCheckStatus" NOT NULL DEFAULT 'QUEUED',
  "details" text,
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "swarm_checks_swarmPrId_fkey" FOREIGN KEY ("swarmPrId") REFERENCES "swarm_prs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "orchestrator_settings" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key" text NOT NULL UNIQUE,
  "value" text NOT NULL,
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Indexes requested
CREATE INDEX IF NOT EXISTS "swarm_runs_taskId_status_idx" ON "swarm_runs" ("taskId", "status");
CREATE INDEX IF NOT EXISTS "swarm_prs_prNumber_idx" ON "swarm_prs" ("prNumber");
CREATE INDEX IF NOT EXISTS "swarm_prs_status_idx" ON "swarm_prs" ("status");
CREATE INDEX IF NOT EXISTS "swarm_checks_swarmPrId_idx" ON "swarm_checks" ("swarmPrId");

-- Supporting indexes
CREATE INDEX IF NOT EXISTS "swarm_worktrees_swarmRunId_idx" ON "swarm_worktrees" ("swarmRunId");
CREATE INDEX IF NOT EXISTS "swarm_sessions_swarmRunId_idx" ON "swarm_sessions" ("swarmRunId");
