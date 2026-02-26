import { SwarmRun } from '@/lib/swarm/types';

const now = Date.now();

export const seededSwarmRuns: SwarmRun[] = [
  {
    id: 'run_001',
    name: 'feat/auth-refresh-hardening',
    status: 'RUNNING',
    startedAt: new Date(now - 1000 * 60 * 42).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 2).toISOString(),
    summary: 'Hardening auth refresh token rotation and replay protections.',
    repo: 'mission-control',
    pr: {
      id: 'pr_501',
      number: 501,
      repo: 'org/mission-control',
      branch: 'swarm/auth-refresh-hardening',
      title: 'Harden auth refresh rotation and replay protection',
      author: 'swarm-bot',
      url: 'https://github.com/org/mission-control/pull/501',
      mergeable: false,
      queuePosition: 3,
      readyToMerge: false,
    },
    checks: [
      { id: 'chk_1', name: 'unit-tests', provider: 'github', status: 'PASSED', completedAt: new Date(now - 1000 * 60 * 12).toISOString() },
      { id: 'chk_2', name: 'typecheck', provider: 'github', status: 'RUNNING' },
      { id: 'chk_3', name: 'e2e-smoke', provider: 'buildkite', status: 'PENDING' },
    ],
    worktrees: [
      { id: 'wt_1', path: '/tmp/swarm/run_001/main', branch: 'swarm/auth-refresh-hardening', dirty: false, updatedAt: new Date(now - 1000 * 60 * 4).toISOString() },
      { id: 'wt_2', path: '/tmp/swarm/run_001/reviewer', branch: 'swarm/auth-review', dirty: true, updatedAt: new Date(now - 1000 * 60 * 7).toISOString() },
    ],
    sessions: [
      { id: 'ses_1', name: 'planner', agentName: 'Atlas', status: 'ACTIVE', lastHeartbeatAt: new Date(now - 1000 * 30).toISOString() },
      { id: 'ses_2', name: 'implementer', agentName: 'Nova', status: 'ACTIVE', lastHeartbeatAt: new Date(now - 1000 * 55).toISOString() },
    ],
    lastErrors: [],
  },
  {
    id: 'run_002',
    name: 'fix/queue-backpressure',
    status: 'PENDING',
    startedAt: new Date(now - 1000 * 60 * 10).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 1).toISOString(),
    summary: 'Reduce queue stalling under burst updates.',
    repo: 'mission-control',
    pr: {
      id: 'pr_502',
      number: 502,
      repo: 'org/mission-control',
      branch: 'swarm/queue-backpressure',
      title: 'Fix scheduler queue backpressure under burst traffic',
      author: 'swarm-bot',
      url: 'https://github.com/org/mission-control/pull/502',
      mergeable: true,
      queuePosition: 1,
      readyToMerge: true,
    },
    checks: [
      { id: 'chk_4', name: 'unit-tests', provider: 'github', status: 'PENDING' },
      { id: 'chk_5', name: 'lint', provider: 'github', status: 'PENDING' },
    ],
    worktrees: [
      { id: 'wt_3', path: '/tmp/swarm/run_002/main', branch: 'swarm/queue-backpressure', dirty: false, updatedAt: new Date(now - 1000 * 60 * 1).toISOString() },
    ],
    sessions: [
      { id: 'ses_3', name: 'planner', agentName: 'Orion', status: 'IDLE', lastHeartbeatAt: new Date(now - 1000 * 60 * 2).toISOString() },
    ],
    lastErrors: [],
  },
  {
    id: 'run_003',
    name: 'chore/cache-invalidation',
    status: 'SUCCESS',
    startedAt: new Date(now - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 25).toISOString(),
    summary: 'Stabilize cache invalidation boundaries for dashboard widgets.',
    repo: 'mission-control',
    pr: {
      id: 'pr_503',
      number: 503,
      repo: 'org/mission-control',
      branch: 'swarm/cache-invalidation',
      title: 'Stabilize cache invalidation boundaries',
      author: 'swarm-bot',
      url: 'https://github.com/org/mission-control/pull/503',
      mergeable: true,
      readyToMerge: true,
    },
    checks: [
      { id: 'chk_6', name: 'unit-tests', provider: 'github', status: 'PASSED', completedAt: new Date(now - 1000 * 60 * 30).toISOString() },
      { id: 'chk_7', name: 'lint', provider: 'github', status: 'PASSED', completedAt: new Date(now - 1000 * 60 * 27).toISOString() },
    ],
    worktrees: [
      { id: 'wt_4', path: '/tmp/swarm/run_003/main', branch: 'swarm/cache-invalidation', dirty: false, updatedAt: new Date(now - 1000 * 60 * 27).toISOString() },
    ],
    sessions: [
      { id: 'ses_4', name: 'implementer', agentName: 'Vega', status: 'IDLE', lastHeartbeatAt: new Date(now - 1000 * 60 * 22).toISOString() },
    ],
    lastErrors: [],
  },
  {
    id: 'run_004',
    name: 'fix/webhook-signature-verify',
    status: 'FAILED',
    startedAt: new Date(now - 1000 * 60 * 67).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 5).toISOString(),
    summary: 'Fix intermittent webhook signature validation mismatch.',
    repo: 'mission-control',
    checks: [
      { id: 'chk_8', name: 'unit-tests', provider: 'github', status: 'FAILED', details: '3 tests failed in webhook-verification.spec.ts', completedAt: new Date(now - 1000 * 60 * 5).toISOString() },
    ],
    worktrees: [
      { id: 'wt_5', path: '/tmp/swarm/run_004/main', branch: 'swarm/webhook-signature', dirty: true, updatedAt: new Date(now - 1000 * 60 * 6).toISOString() },
    ],
    sessions: [
      { id: 'ses_5', name: 'implementer', agentName: 'Nova', status: 'FAILED', lastHeartbeatAt: new Date(now - 1000 * 60 * 5).toISOString() },
    ],
    lastErrors: [
      { id: 'err_1', source: 'unit-tests', message: 'Expected signature digest to match sha256 secret', occurredAt: new Date(now - 1000 * 60 * 5).toISOString() },
      { id: 'err_2', source: 'runner', message: 'Session exited with code 1', occurredAt: new Date(now - 1000 * 60 * 6).toISOString() },
    ],
  },
];
