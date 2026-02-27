-- PR6: Connect workflow orchestration (dev/research) with Swarm execution

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SwarmRunType') THEN
    CREATE TYPE "SwarmRunType" AS ENUM ('FEATURE', 'BUGFIX', 'TEST', 'DEPLOY', 'REVIEW');
  END IF;
END $$;

ALTER TABLE "swarm_runs"
  ADD COLUMN IF NOT EXISTS "run_type" "SwarmRunType" NOT NULL DEFAULT 'TEST';

CREATE INDEX IF NOT EXISTS "swarm_runs_run_type_idx" ON "swarm_runs"("run_type");
