import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export type WorkflowTemplate = {
  id?: string;
  taskType: string;
  config: Record<string, unknown>;
};

export type ColumnRules = {
  defaultRole: string | null;
  requiredArtifacts: string[];
  requiredGates: string[];
  taskType: string | null;
};

export type MoveValidationResult = {
  ok: boolean;
  missingArtifacts: string[];
  missingGates: string[];
  incompatibleTaskType?: {
    taskType: string | null;
    targetTaskType: string | null;
  };
};

type RunGateConfig = {
  runType?: string;
  successStatuses?: string[];
};

type TaskLike = {
  id: string;
  taskType?: string | null;
  artifacts: Record<string, unknown>;
  gates: Record<string, unknown>;
};

type RawTemplateRow = {
  id?: string;
  task_type: string;
  config: Record<string, unknown> | null;
};


const defaultSuccessStatuses = ['success', 'SUCCESS'];

const getTemplateCached = unstable_cache(
  async (taskType: string): Promise<WorkflowTemplate | null> => {
    const rows = await prisma.$queryRaw<RawTemplateRow[]>`
      SELECT id, task_type, config
      FROM workflow_templates
      WHERE task_type = ${taskType}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      taskType: row.task_type,
      config: row.config ?? {},
    };
  },
  ['workflow-template-by-task-type'],
  { revalidate: 60 }
);

export async function getTemplate(taskType: string): Promise<WorkflowTemplate | null> {
  try {
    return await getTemplateCached(taskType);
  } catch {
    return null;
  }
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function parseMetadataRules(metadata: Record<string, unknown> | null | undefined) {
  const rules = (metadata?.rules ?? metadata?.workflow ?? metadata ?? {}) as Record<string, unknown>;

  return {
    defaultRole: typeof rules.default_role === 'string'
      ? rules.default_role
      : typeof rules.defaultRole === 'string'
        ? rules.defaultRole
        : null,
    requiredArtifacts: normalizeStringList(rules.required_artifacts ?? rules.requiredArtifacts),
    requiredGates: normalizeStringList(rules.required_gates ?? rules.requiredGates),
    taskType: typeof rules.task_type === 'string'
      ? rules.task_type
      : typeof rules.taskType === 'string'
        ? rules.taskType
        : null,
  };
}

export function getColumnRules(column: Record<string, unknown>): ColumnRules {
  const metadata = (column.metadata ?? column.config ?? null) as Record<string, unknown> | null;
  const metadataRules = parseMetadataRules(metadata);

  const requiredArtifacts = normalizeStringList(column.required_artifacts ?? column.requiredArtifacts);
  const requiredGates = normalizeStringList(column.required_gates ?? column.requiredGates);

  return {
    defaultRole:
      (typeof column.default_role === 'string' ? column.default_role : null) ??
      (typeof column.defaultRole === 'string' ? column.defaultRole : null) ??
      metadataRules.defaultRole,
    requiredArtifacts: requiredArtifacts.length > 0 ? requiredArtifacts : metadataRules.requiredArtifacts,
    requiredGates: requiredGates.length > 0 ? requiredGates : metadataRules.requiredGates,
    taskType:
      (typeof column.task_type === 'string' ? column.task_type : null) ??
      (typeof column.taskType === 'string' ? column.taskType : null) ??
      metadataRules.taskType,
  };
}

export async function getColumnRulesById(columnId: string): Promise<ColumnRules | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ row: Record<string, unknown> }>>`
      SELECT to_jsonb(task_columns) AS row
      FROM task_columns
      WHERE id = ${columnId}
      LIMIT 1
    `;

    const row = rows[0]?.row;
    if (!row) return null;

    return getColumnRules(row);
  } catch {
    const fallbackColumn = await prisma.taskColumn.findUnique({ where: { id: columnId } });
    if (!fallbackColumn) return null;

    return getColumnRules(fallbackColumn as unknown as Record<string, unknown>);
  }
}

async function hasSuccessfulRun(taskId: string, gateKey: string, runConfig: RunGateConfig): Promise<boolean> {
  const runType = runConfig.runType ?? gateKey;
  const successStatuses = runConfig.successStatuses?.length ? runConfig.successStatuses : defaultSuccessStatuses;

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1
        FROM runs
        WHERE task_id = ${taskId}
          AND run_type = ${runType}
          AND status = ANY(${successStatuses})
      ) AS exists
    `;

    return Boolean(rows[0]?.exists);
  } catch {
    return false;
  }
}

export async function validateMove(task: TaskLike, toColumn: Record<string, unknown>): Promise<MoveValidationResult> {
  const rules = getColumnRules(toColumn);

  if (rules.taskType && rules.taskType !== (task.taskType ?? null)) {
    return {
      ok: false,
      missingArtifacts: [],
      missingGates: [],
      incompatibleTaskType: {
        taskType: task.taskType,
        targetTaskType: rules.taskType,
      },
    };
  }

  const missingArtifacts = rules.requiredArtifacts.filter((artifactKey) => !(artifactKey in task.artifacts));

  const template = task.taskType ? await getTemplate(task.taskType) : null;
  const gateRunConfig = (template?.config?.gate_runs ?? template?.config?.gateRuns ?? {}) as Record<string, RunGateConfig>;

  const missingGates: string[] = [];

  for (const gateKey of rules.requiredGates) {
    const gateValue = task.gates[gateKey];
    if (typeof gateValue === 'boolean') {
      if (!gateValue) {
        missingGates.push(gateKey);
      }
      continue;
    }

    const passed = await hasSuccessfulRun(task.id, gateKey, gateRunConfig[gateKey] ?? {});
    if (!passed) {
      missingGates.push(gateKey);
    }
  }

  return {
    ok: missingArtifacts.length === 0 && missingGates.length === 0,
    missingArtifacts,
    missingGates,
  };
}
