import { TaskStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ColumnRules } from '@/lib/workflows/policy';

type AgentCandidate = {
  id: string;
  status: string;
  config: Record<string, unknown> | null;
  assignedTasks: Array<{ id: string }>;
};

type PickAgentInput = {
  role: string;
  task: {
    id: string;
    taskType?: string | null;
    artifacts: Record<string, unknown>;
    requiredCapabilities?: string[];
    tags?: string[];
  };
  columnRules?: Pick<ColumnRules, 'requiredArtifacts' | 'requiredGates'>;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function capabilityHintsFromTask(input: PickAgentInput): string[] {
  const capabilities = new Set<string>();

  for (const cap of input.task.requiredCapabilities ?? []) capabilities.add(cap);
  for (const tag of input.task.tags ?? []) capabilities.add(tag);
  for (const key of input.columnRules?.requiredArtifacts ?? []) capabilities.add(key);
  for (const key of input.columnRules?.requiredGates ?? []) capabilities.add(key);

  return [...capabilities];
}

function scoreAgent(agent: AgentCandidate, capabilityHints: string[]) {
  const config = (agent.config ?? {}) as Record<string, unknown>;
  const capabilities = toStringArray(config.capabilities);

  const isIdle = agent.status.toLowerCase() === 'idle' ? 1 : 0;
  const overlap = capabilityHints.reduce((count, hint) => count + (capabilities.includes(hint) ? 1 : 0), 0);
  const load = agent.assignedTasks.length;

  return { isIdle, overlap, load };
}

export async function pickBestAgent(input: PickAgentInput): Promise<string | null> {
  const candidates = await prisma.agent.findMany({
    where: {
      status: {
        notIn: ['offline', 'error'],
      },
      config: {
        path: ['role'],
        equals: input.role,
      },
    },
    include: {
      assignedTasks: {
        where: {
          status: {
            not: TaskStatus.DONE,
          },
        },
        select: { id: true },
      },
    },
  });

  if (!candidates.length) return null;

  const capabilityHints = capabilityHintsFromTask(input);

  const ranked = (candidates as AgentCandidate[])
    .map((agent) => ({
      agent,
      score: scoreAgent(agent, capabilityHints),
    }))
    .sort((a, b) => {
      if (a.score.isIdle !== b.score.isIdle) return b.score.isIdle - a.score.isIdle;
      if (a.score.overlap !== b.score.overlap) return b.score.overlap - a.score.overlap;
      if (a.score.load !== b.score.load) return a.score.load - b.score.load;
      return a.agent.id.localeCompare(b.agent.id);
    });

  return ranked[0]?.agent.id ?? null;
}
