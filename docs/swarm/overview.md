# Swarm Control Plane Overview

The Swarm control plane is the Mission Control surface for orchestrating and monitoring OpenClaw-driven implementation runs.

## Goals

- Provide a single operator view for active and recent swarm runs.
- Ingest orchestrator events (worktree/session/PR/checks) with idempotent semantics.
- Evaluate Definition of Done (DoD) gates and expose merge readiness.
- Preserve auditability via activity log events.

## Architecture

```text
OpenClaw Orchestrator
  └─(token-authenticated HTTP POST)
     ├─ /api/swarm/:runId/worktree
     ├─ /api/swarm/:runId/session
     ├─ /api/swarm/:runId/pr
     └─ /api/swarm/:runId/checks
                |
                v
          Prisma persistence
                |
                v
       Swarm dashboard queries
          (/swarm, /swarm/:id)
```

## Runtime Components

- **Ingestion API routes** (`src/app/api/swarm/[runId]/*`): validate orchestrator token, validate payload, upsert run-linked entities, emit activity events.
- **DoD evaluator** (`src/lib/swarm/dod.ts`): computes deterministic gate checks and an `overallReady` rollup.
- **Read model query layer** (`src/lib/swarm/queries.ts`): returns dashboard and run detail DTOs for server-rendered pages.
- **Swarm pages** (`src/app/swarm/page.tsx`, `src/app/swarm/[id]/page.tsx`): operator UX for run status, PR context, checks, sessions, and worktrees.

## Data Model (high-level)

- `swarm_runs`: primary run lifecycle record.
- `swarm_worktrees`: per-run worktree instances (unique by `swarmRunId + branch`).
- `swarm_sessions`: per-run orchestrator sessions (unique by `swarmRunId + externalId`).
- `swarm_prs`: PR attachment to a run (unique by `prNumber`).
- `swarm_checks`: check snapshots attached to PRs.
- `swarm_errors`: runtime ingestion or execution errors.
- `orchestrator_settings`: system-level DoD and orchestration config.

## Idempotency Strategy

The control plane uses **upsert-by-natural-key** behavior in ingestion routes and DB constraints as a safety backstop:

- Worktree natural key: `(swarmRunId, branch)`
- Session natural key: `(swarmRunId, externalId)`
- PR natural key: `(prNumber)`

If an identical event arrives twice, the second call updates the same record and returns `200` (vs `201` on first insert).

## Security

All orchestrator ingestion endpoints require `x-orchestrator-token` to match `SWARM_ORCHESTRATOR_TOKEN`.

## Failure Modes

- Missing/invalid token → `401`
- Missing required payload fields → `400`
- Unknown run id → `404`
- Persistence/runtime exceptions → `500` with error details

## Operational Notes

- Activity events are emitted only when material state changes to reduce noise.
- Dashboard queries fallback to seeded data when DB access fails, preserving UI availability in degraded environments.
