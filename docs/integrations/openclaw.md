# OpenClaw Integration (PR3)

This document describes the current OpenClaw integration assumptions used by Mission Control for linking existing OpenClaw agents.

## Scope

Mission Control **does not create OpenClaw agents**. Instead, a Mission Control agent stores a linked `openclawAgentId` and validates it against OpenClaw.

- Mapping model: **many Mission Control agents → one OpenClaw agent ID**.
- No uniqueness constraint is enforced on `openclawAgentId`.

## Environment Variables

- `OPENCLAW_API_BASE_URL`: Base URL for OpenClaw API (example: `https://api.openclaw.example.com/v1`)
- `OPENCLAW_API_KEY`: Bearer token used for `Authorization: Bearer <key>`
- `OPENCLAW_TIMEOUT_MS`: Request timeout in milliseconds (default `5000`)
- `ADMIN_USER_IDS` (Mission Control): Comma-separated user IDs allowed to link/unlink/validate OpenClaw links

## Endpoint Assumptions

## 1) Get Agent by ID

- Method: `GET`
- URL: `{OPENCLAW_API_BASE_URL}/agents/{id}`
- Success response (assumed minimal shape):

```json
{
  "id": "oc-agent-123",
  "name": "Research Agent",
  "status": "ready"
}
```

Validation rules in Mission Control:
- `200`: link considered valid (`LINKED`)
- `404`: link considered invalid (`INVALID`)
- Any other error/timeout: status set to `UNKNOWN`

## 2) List Agents (optional)

- Method: `GET`
- URL: `{OPENCLAW_API_BASE_URL}/agents`
- Expected shape: array of `{ id, name?, status? }`

If the endpoint is unsupported (`404`, `405`, `501`), Mission Control returns an empty list and keeps UI functional.

## Link Status Model

Mission Control stores:
- `openclawAgentId` (nullable string)
- `openclawLinkStatus` enum: `UNLINKED | LINKED | INVALID | UNKNOWN`

Status flow:
- Link operation: starts from `UNKNOWN` intent, then optional immediate validate determines `LINKED / INVALID / UNKNOWN`
- Unlink operation: sets `openclawAgentId = null`, status `UNLINKED`
- Validate operation: recalculates status as `LINKED / INVALID / UNKNOWN`

## Activity Logging

Every link/unlink/validate operation writes an `activity` row on entity type `agent` with diff keys:
- `openclawAgentId.from/to`
- `openclawLinkStatus.from/to`
- optional `validationError`

## Files

- `src/lib/openclaw/provider.ts`
- `src/lib/openclaw/httpProvider.ts`
- `src/lib/openclaw/mockProvider.ts`
- `src/app/team/actions.ts`
