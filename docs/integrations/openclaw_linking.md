# OpenClaw Agent Linking (PR1 Skeleton)

## Purpose
This document defines the linking approach between Mission Control `agents` and external OpenClaw agents.

## Data Model Summary
Mission Control stores optional OpenClaw link metadata on each local agent record:

- `openclawAgentId` (`string | null`) - external OpenClaw identifier
- `openclawLinkStatus` (`unlinked | linked | invalid | unknown`) - current link state
- `openclawLastValidatedAt` (`DateTime | null`) - last validation timestamp

## Mapping Contract

### Cardinality: many-to-one (local -> external)
Multiple Mission Control agents may point to the same `openclawAgentId`.

- This is intentional (no unique constraint on `openclawAgentId`).
- Use-cases include shadow agents, role-specific wrappers, and staged migrations.

### Lifecycle States
- `unlinked`: no active external mapping
- `linked`: mapping exists and was validated
- `invalid`: mapping exists but validation failed
- `unknown`: mapping exists but has not been validated recently

## Planned Validation Flow
1. User/admin links an agent to `openclawAgentId`.
2. System attempts external validation against OpenClaw.
3. System updates `openclawLinkStatus` and `openclawLastValidatedAt`.
4. Activity log captures the action (`agent.openclaw_*`).

## Planned Activity Actions
- `agent.openclaw_linked`
- `agent.openclaw_unlinked`
- `agent.openclaw_relinked`
- `agent.openclaw_validation_succeeded`
- `agent.openclaw_validation_failed`

## Open Questions (to finalize in follow-up PRs)
- Validation TTL policy before status becomes `unknown`
- Conflict handling when multiple local agents share one OpenClaw agent
- Sync behavior for status/capabilities from OpenClaw into Mission Control
