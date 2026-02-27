export type WorktreeIngestionTarget = {
  runId: string;
  branch: string;
};

export type SessionIngestionTarget = {
  runId: string;
  tmuxSessionName: string;
};

export type PRIngestionTarget = {
  prNumber: number;
};

export function worktreeIdempotencyKey(target: WorktreeIngestionTarget): string {
  return `${target.runId}::${target.branch}`;
}

export function sessionIdempotencyKey(target: SessionIngestionTarget): string {
  return `${target.runId}::${target.tmuxSessionName}`;
}

export function prIdempotencyKey(target: PRIngestionTarget): string {
  return String(target.prNumber);
}

export function isDuplicateWorktreeIngestion(
  first: WorktreeIngestionTarget,
  second: WorktreeIngestionTarget,
): boolean {
  return worktreeIdempotencyKey(first) === worktreeIdempotencyKey(second);
}

export function isDuplicateSessionIngestion(
  first: SessionIngestionTarget,
  second: SessionIngestionTarget,
): boolean {
  return sessionIdempotencyKey(first) === sessionIdempotencyKey(second);
}

export function isDuplicatePRIngestion(first: PRIngestionTarget, second: PRIngestionTarget): boolean {
  return prIdempotencyKey(first) === prIdempotencyKey(second);
}
