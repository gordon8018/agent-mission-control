export type SwarmRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type SwarmCheckStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';

export interface SwarmPRInfo {
  id: string;
  number: number;
  repo: string;
  branch: string;
  title: string;
  author: string;
  url: string;
  mergeable: boolean;
  queuePosition?: number;
  readyToMerge: boolean;
}

export interface SwarmCheck {
  id: string;
  name: string;
  provider: string;
  status: SwarmCheckStatus;
  details?: string;
  completedAt?: string;
}

export interface SwarmWorktree {
  id: string;
  path: string;
  branch: string;
  dirty: boolean;
  updatedAt: string;
}

export interface SwarmError {
  id: string;
  source: string;
  message: string;
  occurredAt: string;
}

export interface SwarmSession {
  id: string;
  name: string;
  agentName: string;
  status: 'ACTIVE' | 'IDLE' | 'FAILED';
  lastHeartbeatAt: string;
}

export interface SwarmRun {
  id: string;
  name: string;
  status: SwarmRunStatus;
  startedAt: string;
  updatedAt: string;
  summary: string;
  repo: string;
  pr?: SwarmPRInfo;
  checks: SwarmCheck[];
  worktrees: SwarmWorktree[];
  sessions: SwarmSession[];
  lastErrors: SwarmError[];
}

export interface SwarmDashboardData {
  activeRuns: SwarmRun[];
  prQueue: SwarmRun[];
  readyToMerge: SwarmRun[];
  failures: SwarmRun[];
}
