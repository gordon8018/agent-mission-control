# Swarm Orchestrator Ingestion API

These endpoints are for OpenClaw orchestrator push updates into Mission Control.

## Authentication

All orchestrator ingestion endpoints require:

- Header: `x-orchestrator-token: <SWARM_ORCHESTRATOR_TOKEN>`

If token is missing or invalid, APIs return `401 Unauthorized`.

## Endpoints

### `POST /api/swarm/:runId/worktree`
Upsert worktree state for a run.

Request body:
```json
{
  "path": "/tmp/worktrees/task-123",
  "branch": "feature/task-123",
  "baseBranch": "main"
}
```

Idempotency key:
- `(runId, branch)`

Behavior:
- Creates new worktree if key does not exist.
- Updates existing worktree when key exists.
- Logs activity only when creation occurs or significant fields changed.

### `POST /api/swarm/:runId/session`
Upsert tmux session state for a run.

Request body:
```json
{
  "tmuxSessionName": "swarm-task-123",
  "agentKind": "coder",
  "modelName": "gpt-5.2-codex",
  "logPath": "/var/log/swarm/task-123.log",
  "status": "ACTIVE"
}
```

Idempotency key:
- `(runId, tmuxSessionName)`

Behavior:
- Creates or updates the session associated to a tmux session name.
- Stores `agentKind`, `modelName`, `logPath` in `metadata`.
- Logs activity only on meaningful changes (status or tracked metadata changes).

### `POST /api/swarm/:runId/pr`
Upsert PR linkage for a run.

Request body:
```json
{
  "prNumber": 42,
  "prUrl": "https://github.com/org/repo/pull/42",
  "ciStatus": "passed"
}
```

Idempotency key:
- `prNumber`

Behavior:
- Creates new PR record when `prNumber` is new.
- Updates existing PR record when `prNumber` already exists.
- Updates PR URL and stores `ciStatus` in metadata.
- Logs activity only when relevant fields changed.

### `POST /api/swarm/:runId/checks`
Ingest orchestrator check snapshot payload for the run's latest PR.

Request body:
```json
{
  "checksJson": {
    "ci": "passed",
    "lint": "passed",
    "tests": "passed"
  }
}
```

Also accepts string payload in `checksJson`.

Behavior:
- Resolves latest PR for `runId`.
- Upserts a dedicated `orchestrator_checks` check row for that PR.
- Uses a heuristic status (`FAILED` if payload includes `fail`, otherwise `PASSED`).
- Logs activity only when checks payload/status materially changed.

> Note: clients can alternatively use existing `POST /api/swarm/:prId/evaluate` for Definition-of-Done evaluation.
