import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDuplicatePRIngestion,
  isDuplicateSessionIngestion,
  isDuplicateWorktreeIngestion,
  prIdempotencyKey,
  sessionIdempotencyKey,
  worktreeIdempotencyKey,
} from '@/lib/swarm/ingestion';

test('worktree idempotency key is stable for same run + branch', () => {
  const first = { runId: 'run_123', branch: 'swarm/feature-a' };
  const second = { runId: 'run_123', branch: 'swarm/feature-a' };

  assert.equal(worktreeIdempotencyKey(first), worktreeIdempotencyKey(second));
  assert.equal(isDuplicateWorktreeIngestion(first, second), true);
});

test('session idempotency key is stable for same run + tmuxSessionName', () => {
  const first = { runId: 'run_123', tmuxSessionName: 'swarm-task-42' };
  const second = { runId: 'run_123', tmuxSessionName: 'swarm-task-42' };

  assert.equal(sessionIdempotencyKey(first), sessionIdempotencyKey(second));
  assert.equal(isDuplicateSessionIngestion(first, second), true);
});

test('pr idempotency key uses prNumber regardless of run context', () => {
  const first = { prNumber: 42 };
  const second = { prNumber: 42 };
  const third = { prNumber: 43 };

  assert.equal(prIdempotencyKey(first), '42');
  assert.equal(isDuplicatePRIngestion(first, second), true);
  assert.equal(isDuplicatePRIngestion(first, third), false);
});
