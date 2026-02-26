-- PR5: Add unique constraints for orchestrator ingestion idempotency

CREATE UNIQUE INDEX IF NOT EXISTS "swarm_worktrees_swarmRunId_branch_key"
  ON "swarm_worktrees" ("swarmRunId", "branch");

CREATE UNIQUE INDEX IF NOT EXISTS "swarm_sessions_swarmRunId_externalId_key"
  ON "swarm_sessions" ("swarmRunId", "externalId");

CREATE UNIQUE INDEX IF NOT EXISTS "swarm_prs_prNumber_key"
  ON "swarm_prs" ("prNumber");
