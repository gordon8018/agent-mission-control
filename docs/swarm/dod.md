# Swarm Definition of Done (DoD)

This document defines merge-readiness checks for swarm runs and how they map to the evaluator implementation.

## Source of Truth

- Evaluator logic: `src/lib/swarm/dod.ts`
- Consumer endpoint: `POST /api/swarm/:prId/evaluate`
- Configuration source: `orchestrator_settings` (`dodConfig` and `requiredReviews`)

## Gate Checks

The evaluator emits these checks:

1. `prCreated`
2. `ciPassed`
3. `codexReviewPassed`
4. `geminiReviewPassed`
5. `claudeReviewPassed`
6. `screenshotProvided`
7. `screenshotRequirementMet`

`overallReady` is `true` only when **all checks are `true`**.

## Rules

### PR gate
- Pass when a PR exists for the run.

### CI gate
- Pass only when CI status equals `passed`.

### Review gates
- Reviews are independently configurable (`codex`, `gemini`, `claude`).
- If a review is not required, that review gate is treated as passed.
- If required, the gate passes only when status is `approved`.

### Screenshot gates
- `screenshotProvided`: raw presence signal.
- `screenshotRequirementMet`: passes when screenshots are optional, or when required and present.

## Config Shape

```json
{
  "screenshotRequired": true,
  "requiredReviews": {
    "codex": true,
    "gemini": false,
    "claude": false
  }
}
```

## Expected Behaviors

- Required gate failure blocks `overallReady`.
- Optional review failures do not block readiness.
- Missing required screenshot blocks readiness.

## Test Coverage

Unit tests validate:

- all-required success path,
- optional review bypass,
- failed PR/CI/review gates,
- required screenshot missing.

See `src/lib/swarm/dod.test.ts`.
