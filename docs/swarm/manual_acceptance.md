# Swarm Manual Acceptance

Step-by-step checks for PR7 validation in a local/dev environment.

## Preconditions

- App running (`npm run dev`).
- Database migrated/seeds applied.
- `SWARM_ORCHESTRATOR_TOKEN` configured.
- At least one swarm run exists (or use seeded fallback).

## 1) Dashboard renders

1. Open `/swarm`.
2. Confirm active/recent run cards render.
3. Confirm each card shows status and updated metadata.

**Pass:** Dashboard loads without error and cards are visible.

## 2) Run details render

1. Open a run detail page from dashboard (`/swarm/:id`).
2. Verify PR panel, checks panel, sessions/worktrees blocks render.

**Pass:** Run detail sections are present and populated.

## 3) Worktree ingestion idempotency

1. POST to `/api/swarm/:runId/worktree` with valid token and payload.
2. Repeat exact same POST.
3. Confirm first response is `201`, second is `200`.
4. Confirm only one worktree record exists for `(runId, branch)`.

Example payload:

```json
{
  "path": "/tmp/swarm/run_001/main",
  "branch": "swarm/test-branch",
  "baseBranch": "main"
}
```

## 4) Session ingestion idempotency

1. POST to `/api/swarm/:runId/session` with `tmuxSessionName`.
2. Repeat same POST.
3. Confirm `201` then `200`.
4. Confirm only one session record exists for `(runId, tmuxSessionName)`.

## 5) PR ingestion idempotency

1. POST to `/api/swarm/:runId/pr` with `prNumber` and `prUrl`.
2. Repeat same POST.
3. Confirm `201` then `200`.
4. Confirm only one PR record exists for `prNumber`.

## 6) DoD evaluation path

1. Ensure run has attached PR and checks metadata.
2. Call `POST /api/swarm/:prId/evaluate`.
3. Verify response includes all gate checks and `overallReady`.
4. Toggle a required gate (e.g., CI failed) and re-evaluate.

**Pass:** `overallReady` flips according to gate state.

## 7) Unauthorized ingestion blocked

1. Send ingestion request without `x-orchestrator-token`.

**Pass:** Response is `401 Unauthorized`.

## 8) Optional UI smoke with browser tooling

1. Open `/swarm`.
2. Open a run.
3. Verify checks panel contains orchestrator and DoD-related checks.

**Pass:** Operator can navigate run and inspect checks end-to-end.
