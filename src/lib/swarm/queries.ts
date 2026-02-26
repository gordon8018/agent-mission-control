import { prisma } from '@/lib/prisma';
import { seededSwarmRuns } from '@/lib/swarm/dummy-data';
import { SwarmCheck, SwarmDashboardData, SwarmError, SwarmPRInfo, SwarmRun, SwarmSession, SwarmWorktree } from '@/lib/swarm/types';

interface SwarmRunRow {
  id: string;
  name: string;
  status: SwarmRun['status'];
  started_at: Date;
  updated_at: Date;
  summary: string;
  repo: string;
}

interface SwarmPRRow {
  id: string;
  run_id: string;
  number: number;
  repo: string;
  branch: string;
  title: string;
  author: string;
  url: string;
  mergeable: boolean;
  queue_position: number | null;
  ready_to_merge: boolean;
}

interface SwarmCheckRow {
  id: string;
  run_id: string;
  name: string;
  provider: string;
  status: SwarmCheck['status'];
  details: string | null;
  completed_at: Date | null;
}

interface SwarmWorktreeRow {
  id: string;
  run_id: string;
  path: string;
  branch: string;
  dirty: boolean;
  updated_at: Date;
}

interface SwarmSessionRow {
  id: string;
  run_id: string;
  name: string;
  agent_name: string;
  status: SwarmSession['status'];
  last_heartbeat_at: Date;
}

interface SwarmErrorRow {
  id: string;
  run_id: string;
  source: string;
  message: string;
  occurred_at: Date;
}

function buildDashboardData(runs: SwarmRun[]): SwarmDashboardData {
  return {
    activeRuns: runs.filter((run) => run.status === 'RUNNING' || run.status === 'PENDING'),
    prQueue: runs.filter((run) => run.pr?.queuePosition !== undefined).sort((a, b) => (a.pr?.queuePosition ?? 999) - (b.pr?.queuePosition ?? 999)),
    readyToMerge: runs.filter((run) => run.pr?.readyToMerge),
    failures: runs.filter((run) => run.status === 'FAILED' || run.checks.some((check) => check.status === 'FAILED')),
  };
}

function mapRun(
  run: SwarmRunRow,
  prByRunId: Map<string, SwarmPRInfo>,
  checksByRunId: Map<string, SwarmCheck[]>,
  worktreesByRunId: Map<string, SwarmWorktree[]>,
  sessionsByRunId: Map<string, SwarmSession[]>,
  errorsByRunId: Map<string, SwarmError[]>
): SwarmRun {
  return {
    id: run.id,
    name: run.name,
    status: run.status,
    startedAt: run.started_at.toISOString(),
    updatedAt: run.updated_at.toISOString(),
    summary: run.summary,
    repo: run.repo,
    pr: prByRunId.get(run.id),
    checks: checksByRunId.get(run.id) ?? [],
    worktrees: worktreesByRunId.get(run.id) ?? [],
    sessions: sessionsByRunId.get(run.id) ?? [],
    lastErrors: errorsByRunId.get(run.id) ?? [],
  };
}

async function querySwarmRuns(): Promise<SwarmRun[]> {
  const runs = await prisma.$queryRaw<SwarmRunRow[]>`
    SELECT id, name, status, started_at, updated_at, summary, repo
    FROM swarm_runs
    ORDER BY started_at DESC
    LIMIT 50
  `;

  if (runs.length === 0) {
    return [];
  }

  const runIds = runs.map((run) => run.id);

  const [prs, checks, worktrees, sessions, errors] = await Promise.all([
    prisma.$queryRaw<SwarmPRRow[]>`
      SELECT id, run_id, number, repo, branch, title, author, url, mergeable, queue_position, ready_to_merge
      FROM swarm_prs
      WHERE run_id = ANY(${runIds}::text[])
    `,
    prisma.$queryRaw<SwarmCheckRow[]>`
      SELECT id, run_id, name, provider, status, details, completed_at
      FROM swarm_checks
      WHERE run_id = ANY(${runIds}::text[])
      ORDER BY name ASC
    `,
    prisma.$queryRaw<SwarmWorktreeRow[]>`
      SELECT id, run_id, path, branch, dirty, updated_at
      FROM swarm_worktrees
      WHERE run_id = ANY(${runIds}::text[])
      ORDER BY updated_at DESC
    `,
    prisma.$queryRaw<SwarmSessionRow[]>`
      SELECT id, run_id, name, agent_name, status, last_heartbeat_at
      FROM swarm_sessions
      WHERE run_id = ANY(${runIds}::text[])
      ORDER BY last_heartbeat_at DESC
    `,
    prisma.$queryRaw<SwarmErrorRow[]>`
      SELECT id, run_id, source, message, occurred_at
      FROM swarm_errors
      WHERE run_id = ANY(${runIds}::text[])
      ORDER BY occurred_at DESC
    `,
  ]);

  const prByRunId = new Map<string, SwarmPRInfo>(
    prs.map((pr) => [
      pr.run_id,
      {
        id: pr.id,
        number: pr.number,
        repo: pr.repo,
        branch: pr.branch,
        title: pr.title,
        author: pr.author,
        url: pr.url,
        mergeable: pr.mergeable,
        queuePosition: pr.queue_position ?? undefined,
        readyToMerge: pr.ready_to_merge,
      },
    ])
  );

  const checksByRunId = new Map<string, SwarmCheck[]>();
  for (const check of checks) {
    checksByRunId.set(check.run_id, [
      ...(checksByRunId.get(check.run_id) ?? []),
      {
        id: check.id,
        name: check.name,
        provider: check.provider,
        status: check.status,
        details: check.details ?? undefined,
        completedAt: check.completed_at?.toISOString(),
      },
    ]);
  }

  const worktreesByRunId = new Map<string, SwarmWorktree[]>();
  for (const worktree of worktrees) {
    worktreesByRunId.set(worktree.run_id, [
      ...(worktreesByRunId.get(worktree.run_id) ?? []),
      {
        id: worktree.id,
        path: worktree.path,
        branch: worktree.branch,
        dirty: worktree.dirty,
        updatedAt: worktree.updated_at.toISOString(),
      },
    ]);
  }

  const sessionsByRunId = new Map<string, SwarmSession[]>();
  for (const session of sessions) {
    sessionsByRunId.set(session.run_id, [
      ...(sessionsByRunId.get(session.run_id) ?? []),
      {
        id: session.id,
        name: session.name,
        agentName: session.agent_name,
        status: session.status,
        lastHeartbeatAt: session.last_heartbeat_at.toISOString(),
      },
    ]);
  }

  const errorsByRunId = new Map<string, SwarmError[]>();
  for (const error of errors) {
    errorsByRunId.set(error.run_id, [
      ...(errorsByRunId.get(error.run_id) ?? []),
      {
        id: error.id,
        source: error.source,
        message: error.message,
        occurredAt: error.occurred_at.toISOString(),
      },
    ]);
  }

  return runs.map((run) => mapRun(run, prByRunId, checksByRunId, worktreesByRunId, sessionsByRunId, errorsByRunId));
}

export async function getSwarmDashboardData(): Promise<SwarmDashboardData> {
  try {
    const runs = await querySwarmRuns();
    return buildDashboardData(runs);
  } catch {
    return buildDashboardData(seededSwarmRuns);
  }
}

export async function getSwarmRunById(id: string): Promise<SwarmRun | null> {
  try {
    const runs = await querySwarmRuns();
    return runs.find((run) => run.id === id) ?? null;
  } catch {
    return seededSwarmRuns.find((run) => run.id === id) ?? null;
  }
}
