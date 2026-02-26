-- PR4: Swarm start mapping from Mission Control agent -> OpenClaw orchestrator agent

ALTER TABLE "swarm_runs"
  ADD COLUMN IF NOT EXISTS "orchestrator_agent_id" TEXT,
  ADD COLUMN IF NOT EXISTS "block_reason" TEXT;

CREATE INDEX IF NOT EXISTS "swarm_runs_orchestrator_agent_id_idx" ON "swarm_runs"("orchestrator_agent_id");
