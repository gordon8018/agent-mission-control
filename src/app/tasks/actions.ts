'use server';

import { prisma } from '@/lib/prisma';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getColumnRulesById, validateMove } from '@/lib/workflows/policy';
import { pickBestAgent } from '@/lib/agents/pickBestAgent';

// Helper: Create activity log
async function logActivity(params: {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  message?: string;
  diff?: Record<string, any>;
}, db: Prisma.TransactionClient | typeof prisma = prisma) {
  await db.activity.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      performedBy: params.performedBy,
      changes: {
        message: params.message,
        diff: params.diff,
      },
    },
  });
}

// CREATE TASK
export async function createTask(data: {
  title: string;
  description?: string;
  columnId: string;
  priority: TaskPriority;
  tags?: string[];
  dueDate?: Date;
  assignedToUserId?: string;
  assignedToAgentId?: string;
  createdById: string;
}) {
  // Get the highest position in the column
  const maxPositionTask = await prisma.task.findFirst({
    where: { columnId: data.columnId },
    orderBy: { position: 'desc' },
  });

  const position = (maxPositionTask?.position ?? 0) + 1;

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      columnId: data.columnId,
      position,
      priority: data.priority,
      dueDate: data.dueDate,
      assignedToUserId: data.assignedToUserId,
      assignedToAgentId: data.assignedToAgentId,
      createdById: data.createdById,
      artifacts: data.tags ? { tags: data.tags } : undefined,
    },
    include: {
      column: true,
      assignedToUser: { select: { id: true, name: true } },
      assignedToAgent: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Log activity
  await logActivity({
    entityType: 'task',
    entityId: task.id,
    action: 'create',
    performedBy: data.createdById,
    message: `Created task "${task.title}"`,
    diff: {
      title: data.title,
      columnId: data.columnId,
      priority: data.priority,
      assignee: data.assignedToUserId || data.assignedToAgentId,
    },
  });

  revalidatePath('/tasks');
  return { success: true, task };
}

// UPDATE TASK
export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    tags?: string[];
    dueDate?: Date | null;
    assignedToUserId?: string | null;
    assignedToAgentId?: string | null;
  },
  performedBy: string
) {
  const oldTask = await prisma.task.findUnique({ where: { id } });
  if (!oldTask) throw new Error('Task not found');

  // Build diff
  const diff: Record<string, any> = {};
  if (data.title !== undefined && data.title !== oldTask.title) diff.title = { from: oldTask.title, to: data.title };
  if (data.description !== undefined) diff.description = { from: oldTask.description, to: data.description };
  if (data.priority !== undefined && data.priority !== oldTask.priority) diff.priority = { from: oldTask.priority, to: data.priority };
  if (data.status !== undefined && data.status !== oldTask.status) diff.status = { from: oldTask.status, to: data.status };
  if (data.dueDate !== undefined) diff.dueDate = { from: oldTask.dueDate, to: data.dueDate };
  if (data.assignedToUserId !== undefined) diff.assignedToUserId = { from: oldTask.assignedToUserId, to: data.assignedToUserId };
  if (data.assignedToAgentId !== undefined) diff.assignedToAgentId = { from: oldTask.assignedToAgentId, to: data.assignedToAgentId };

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.assignedToUserId !== undefined && { assignedToUserId: data.assignedToUserId }),
      ...(data.assignedToAgentId !== undefined && { assignedToAgentId: data.assignedToAgentId }),
      ...(data.tags !== undefined && { artifacts: { tags: data.tags } }),
    },
    include: {
      column: true,
      assignedToUser: { select: { id: true, name: true } },
      assignedToAgent: { select: { id: true, name: true } },
    },
  });

  // Log activity
  await logActivity({
    entityType: 'task',
    entityId: id,
    action: 'update',
    performedBy,
    message: `Updated task "${task.title}"`,
    diff,
  });

  revalidatePath('/tasks');
  return { success: true, task };
}

// DELETE TASK
export async function deleteTask(id: string, performedBy: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new Error('Task not found');

  await prisma.task.delete({ where: { id } });

  // Log activity
  await logActivity({
    entityType: 'task',
    entityId: id,
    action: 'delete',
    performedBy,
    message: `Deleted task "${task.title}"`,
    diff: {
      title: task.title,
      columnId: task.columnId,
      status: task.status,
    },
  });

  revalidatePath('/tasks');
  return { success: true };
}

// MOVE TASK (drag and drop)
export async function moveTask(
  id: string,
  data: {
    columnId: string;
    position: number;
  },
  performedBy: string
) {
  const { columnId, position } = data;
  const result = await prisma.$transaction(async (tx) => {
    const oldTask = await tx.task.findUnique({ where: { id } });
    if (!oldTask) throw new Error('Task not found');

    const rawColumns = await tx.$queryRaw<Array<{ row: Record<string, unknown> }>>`
      SELECT to_jsonb(task_columns) AS row
      FROM task_columns
      WHERE id = ${columnId}
      LIMIT 1
    `;
    const rawColumn = rawColumns[0]?.row;

    if (!rawColumn) {
      throw new Error('Target column not found');
    }

    const artifacts = ((oldTask.artifacts as Record<string, unknown> | null) ?? {});
    const taskGates = (artifacts.gates as Record<string, unknown> | undefined) ?? {};
    const taskType = ((oldTask as unknown as Record<string, unknown>).task_type ??
      (oldTask as unknown as Record<string, unknown>).taskType ??
      artifacts.taskType ??
      artifacts.task_type ??
      null) as string | null;

    const validation = await validateMove(
      {
        id: oldTask.id,
        taskType,
        artifacts,
        gates: taskGates,
      },
      rawColumn
    );

    if (!validation.ok) {
      await logActivity(
        {
          entityType: 'task',
          entityId: id,
          action: 'gate.checked',
          performedBy,
          message: 'Workflow gate check failed',
          diff: {
            passed: false,
            toColumn: columnId,
            missingArtifacts: validation.missingArtifacts,
            missingGates: validation.missingGates,
            incompatibleTaskType: validation.incompatibleTaskType ?? null,
          },
        },
        tx
      );

      return {
        success: false as const,
        missingArtifacts: validation.missingArtifacts,
        missingGates: validation.missingGates,
        incompatibleTaskType: validation.incompatibleTaskType ?? null,
      };
    }

    // Update positions in old column (if moving to different column or moving within same column)
    if (oldTask.columnId !== columnId) {
      await tx.task.updateMany({
        where: {
          columnId: oldTask.columnId,
          position: { gt: oldTask.position },
        },
        data: {
          position: { decrement: 1 },
        },
      });

      await tx.task.updateMany({
        where: {
          columnId,
          position: { gte: position },
        },
        data: {
          position: { increment: 1 },
        },
      });
    } else {
      if (position > oldTask.position) {
        await tx.task.updateMany({
          where: {
            columnId,
            position: { gt: oldTask.position, lte: position },
            id: { not: id },
          },
          data: { position: { decrement: 1 } },
        });
      } else if (position < oldTask.position) {
        await tx.task.updateMany({
          where: {
            columnId,
            position: { gte: position, lt: oldTask.position },
            id: { not: id },
          },
          data: { position: { increment: 1 } },
        });
      }
    }

    const targetStatus = typeof rawColumn.status === 'string' ? rawColumn.status : null;
    const normalizedStatus = targetStatus ? TaskStatus[targetStatus.toUpperCase() as keyof typeof TaskStatus] : null;

    const columnRules = await getColumnRulesById(columnId);
    const defaultRole = columnRules?.defaultRole ?? null;

    let assignedToAgentId = oldTask.assignedToAgentId;
    if (defaultRole) {
      assignedToAgentId = await pickBestAgent({
        role: defaultRole,
        task: {
          id: oldTask.id,
          taskType,
          artifacts,
          requiredCapabilities: Array.isArray(artifacts.requiredCapabilities)
            ? (artifacts.requiredCapabilities as string[])
            : undefined,
          tags: Array.isArray(artifacts.tags) ? (artifacts.tags as string[]) : undefined,
        },
        columnRules: {
          requiredArtifacts: columnRules?.requiredArtifacts ?? [],
          requiredGates: columnRules?.requiredGates ?? [],
        },
      });
    }

    const task = await tx.task.update({
      where: { id },
      data: {
        columnId,
        position,
        ...(normalizedStatus && { status: normalizedStatus }),
        ...(defaultRole && { assignedToAgentId }),
      },
      include: {
        column: true,
        assignedToUser: { select: { id: true, name: true } },
        assignedToAgent: { select: { id: true, name: true } },
      },
    });

    await logActivity(
      {
        entityType: 'task',
        entityId: id,
        action: 'gate.checked',
        performedBy,
        message: 'Workflow gate check passed',
        diff: {
          passed: true,
          toColumn: columnId,
          checkedArtifacts: columnRules?.requiredArtifacts ?? [],
          checkedGates: columnRules?.requiredGates ?? [],
        },
      },
      tx
    );

    await logActivity(
      {
        entityType: 'task',
        entityId: id,
        action: 'task.moved',
        performedBy,
        message: `Moved task "${task.title}"`,
        diff: {
          fromColumn: oldTask.columnId,
          toColumn: columnId,
          fromPosition: oldTask.position,
          toPosition: position,
          fromStatus: oldTask.status,
          toStatus: task.status,
        },
      },
      tx
    );

    if (defaultRole && assignedToAgentId) {
      await logActivity(
        {
          entityType: 'task',
          entityId: id,
          action: 'task.assigned',
          performedBy,
          message: `Task auto-assigned for role ${defaultRole}`,
          diff: {
            role: defaultRole,
            assignedToAgentId,
          },
        },
        tx
      );
    }

    return {
      success: true as const,
      task,
      status: task.status,
      oldStatus: oldTask.status,
    };
  });

  if (!result.success) {
    revalidatePath('/tasks');
    return result;
  }

  // Auto-generate memory when task is completed
  if (result.status === TaskStatus.DONE && result.oldStatus !== TaskStatus.DONE) {
    try {
      const { generateTaskDoneMemory } = await import('../memory/actions');
      await generateTaskDoneMemory(id, 'system-worker');
    } catch (error) {
      console.error('Failed to auto-generate memory for completed task:', error);
      // Don't fail the move operation if memory generation fails
    }
  }

  revalidatePath('/tasks');
  return { success: true, task: result.task, status: result.status };
}

// ADD ARTIFACT TO TASK
export async function addTaskArtifact(
  id: string,
  data: {
    type: string;
    name?: string;
    content?: any;
    metadata?: Record<string, any>;
  },
  performedBy: string
) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new Error('Task not found');

  const currentArtifacts = (task.artifacts as any) || {};
  const artifactId = Date.now().toString();

  const newArtifacts = {
    ...currentArtifacts,
    artifacts: [
      ...(currentArtifacts.artifacts || []),
      { id: artifactId, ...data, createdAt: new Date().toISOString() },
    ],
  };

  await prisma.task.update({
    where: { id },
    data: { artifacts: newArtifacts as Prisma.JsonValue },
  });

  // Log activity
  await logActivity({
    entityType: 'task',
    entityId: id,
    action: 'add_artifact',
    performedBy,
    message: `Added artifact to task "${task.title}"`,
    diff: {
      artifactId,
      type: data.type,
      name: data.name,
    },
  });

  revalidatePath('/tasks');
  return { success: true };
}

// GET TASKS WITH FILTERS
export async function getTasks(filters: {
  columnId?: string;
  status?: TaskStatus;
  assigneeUserId?: string;
  assigneeAgentId?: string;
  tag?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  search?: string;
}) {
  const where: Prisma.TaskWhereInput = {};

  if (filters.columnId) where.columnId = filters.columnId;
  if (filters.status) where.status = filters.status;
  if (filters.assigneeUserId) where.assignedToUserId = filters.assigneeUserId;
  if (filters.assigneeAgentId) where.assignedToAgentId = filters.assigneeAgentId;
  if (filters.dueBefore) where.dueDate = { lte: filters.dueBefore };
  if (filters.dueAfter) where.dueDate = { gte: filters.dueAfter };
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Filter by tag (JSON contains)
  if (filters.tag) {
    where.artifacts = {
      path: ['tags'],
      array_contains: [filters.tag],
    };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      column: true,
      assignedToUser: { select: { id: true, name: true } },
      assignedToAgent: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { position: 'asc' },
  });

  return tasks;
}
